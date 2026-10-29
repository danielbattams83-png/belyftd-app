const {initializeApp} = require('firebase-admin/app');
const {getAuth} = require('firebase-admin/auth');
const {getFirestore, FieldValue} = require('firebase-admin/firestore');
const {getStorage} = require('firebase-admin/storage');
const {HttpsError, onCall} = require('firebase-functions/v2/https');
const {onDocumentUpdated} = require('firebase-functions/v2/firestore');

initializeApp();

const db = getFirestore();

Object.assign(exports, require('./super-admin'));

const VALID_TIERS = [1, 2, 3, 4];

async function findByRedemptionCode(collectionName, code) {
  const snapshot = await db.collection(collectionName)
    .where('redemptionCodes', 'array-contains', code)
    .limit(1)
    .get();
  return snapshot.empty ? null : snapshot.docs[0];
}

function standardGroup(source, groupDoc) {
  const data = groupDoc.data();
  return {
    source,
    ref: groupDoc.ref,
    groupId: groupDoc.id,
    orgId: null,
    active: data.active,
    subscriptionTier: data.subscriptionTier,
    sponsorName: data.organizationName ?? data.sponsorName,
    role: typeof data.role === 'string' ? data.role : null,
  };
}

/**
 * Resolves a code in priority order:
 * 1. inviteCodes/{CODE} legacy partner codes
 * 2. inviteCodes/* Lyft'd internal access (lyftd-admin, lyftd-guest) via redemptionCodes
 * 3. subscribers/* standard-theme subscriber groups via redemptionCodes
 * 4. partners/* custom-theme partners via redemptionCodes (managed in the Sponsor Admin)
 */
async function resolveAccessCode(code) {
  const legacy = await db.collection('inviteCodes').doc(code).get();
  if (legacy.exists && typeof legacy.data().orgId === 'string') {
    const data = legacy.data();
    return {source: 'partner', ref: legacy.ref, groupId: data.orgId, orgId: data.orgId, active: data.active,
      subscriptionTier: data.subscriptionTier, sponsorName: data.sponsorName, role: null};
  }
  const internal = await findByRedemptionCode('inviteCodes', code);
  if (internal) return standardGroup('lyftd', internal);
  const subscriber = await findByRedemptionCode('subscribers', code);
  if (subscriber) return standardGroup('subscriber', subscriber);
  const partnerDoc = await findByRedemptionCode('partners', code);
  if (!partnerDoc) return null;
  const partner = partnerDoc.data();
  return {source: 'partner', ref: partnerDoc.ref, groupId: partnerDoc.id, orgId: partnerDoc.id, active: partner.active,
    subscriptionTier: partner.subscriptionTier, sponsorName: partner.organizationName, role: null};
}

async function getValidSponsorInvite(value) {
  const code = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!/^[A-Z0-9_-]{6,32}$/.test(code)) {
    throw new HttpsError('invalid-argument', 'Enter a valid access code.');
  }

  const invite = await resolveAccessCode(code);
  if (!invite) {
    throw new HttpsError('not-found', 'This access code is not recognized.');
  }
  // Partner members always inherit the partner's current tier, even for legacy inviteCodes entries.
  if (invite.orgId) {
    const partner = await db.collection('partners').doc(invite.orgId).get();
    if (partner.exists && VALID_TIERS.includes(partner.data().subscriptionTier)) {
      invite.subscriptionTier = partner.data().subscriptionTier;
    }
  }
  if (
    invite.active !== true ||
    !VALID_TIERS.includes(invite.subscriptionTier) ||
    typeof invite.groupId !== 'string' ||
    typeof invite.sponsorName !== 'string' ||
    !invite.sponsorName.trim()
  ) {
    throw new HttpsError('failed-precondition', 'This access code is not currently available.');
  }

  return {code, invite};
}

// orgId and the group name are safe to return pre-auth: they only drive the gate's preview styling.
// invoker: 'public' only opens the Cloud Run network layer; Firebase Auth is still checked in-handler.
exports.checkSponsorCode = onCall({maxInstances: 5, invoker: 'public'}, async (request) => {
  const {invite} = await getValidSponsorInvite(request.data?.code);
  return {valid: true, orgId: invite.orgId, groupName: invite.sponsorName, groupType: invite.source};
});

exports.redeemSponsorCode = onCall({invoker: 'public'}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before redeeming an access code.');
  }
  if (request.auth.token?.firebase?.sign_in_provider === 'anonymous') {
    throw new HttpsError('unauthenticated', 'Create an account before redeeming an access code.');
  }
  const {code, invite} = await getValidSponsorInvite(request.data?.code);

  // An account belongs to exactly one partner or subscriber group; another group's code cannot move it.
  const profileRef = db.collection('sponsorProfiles').doc(request.auth.uid);
  const existing = await profileRef.get();
  if (existing.exists) {
    const current = existing.data();
    if ((current.groupId ?? current.orgId) !== invite.groupId) {
      throw new HttpsError('permission-denied', 'This account is already connected to another group.');
    }
  }

  const auth = getAuth();
  const user = await auth.getUser(request.auth.uid);
  const claims = {...user.customClaims, subscriptionTier: invite.subscriptionTier, accessGroup: invite.groupId};
  if (invite.orgId) claims.orgId = invite.orgId;
  else delete claims.orgId;
  if (invite.role) claims.lyftdRole = invite.role;
  else delete claims.lyftdRole;
  await auth.setCustomUserClaims(request.auth.uid, claims);

  const profile = {
    orgId: invite.orgId,
    groupId: invite.groupId,
    groupType: invite.source,
    sponsorName: invite.sponsorName,
    subscriptionTier: invite.subscriptionTier,
    codeId: code,
  };
  await profileRef.set({
    ...profile,
    role: invite.role,
    redeemedAt: existing.exists ? existing.data().redeemedAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
  });

  if (!existing.exists) {
    await invite.ref.update({'analytics.totalRedemptions': FieldValue.increment(1)})
      .catch(error => console.warn(`Unable to count redemption for ${invite.ref.path}:`, error));
  }

  return profile;
});

async function syncMemberTiers(groupField, groupId, subscriptionTier) {
  const auth = getAuth();
  const members = await db.collection('sponsorProfiles').where(groupField, '==', groupId).get();
  let updated = 0;
  for (const member of members.docs) {
    if (member.data().subscriptionTier === subscriptionTier) continue;
    try {
      const user = await auth.getUser(member.id);
      await auth.setCustomUserClaims(member.id, {...user.customClaims, subscriptionTier});
    } catch (error) {
      if (error?.code !== 'auth/user-not-found') throw error;
    }
    await member.ref.update({subscriptionTier, tierUpdatedAt: FieldValue.serverTimestamp()});
    updated += 1;
  }
  return updated;
}

function syncPartnerMemberTiers(partnerId, subscriptionTier) {
  return syncMemberTiers('orgId', partnerId, subscriptionTier);
}
exports.syncPartnerMemberTiers = syncPartnerMemberTiers;

function tierChange(event) {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const tier = after?.subscriptionTier;
  if (!after || before?.subscriptionTier === tier || !VALID_TIERS.includes(tier)) return null;
  return {after, tier};
}

exports.onPartnerTierChanged = onDocumentUpdated('partners/{partnerId}', async (event) => {
  const change = tierChange(event);
  if (!change) return;
  const updated = await syncPartnerMemberTiers(event.params.partnerId, change.tier);
  console.log(`Partner ${event.params.partnerId} moved to tier ${change.tier}; updated ${updated} member(s).`);
});

exports.onSubscriberTierChanged = onDocumentUpdated('subscribers/{groupId}', async (event) => {
  const change = tierChange(event);
  if (!change) return;
  const updated = await syncMemberTiers('groupId', event.params.groupId, change.tier);
  console.log(`Subscriber group ${event.params.groupId} moved to tier ${change.tier}; updated ${updated} member(s).`);
});

// Legacy partner invite codes follow their partner's tier, so only Lyft'd access docs are synced here.
exports.onLyftdAccessTierChanged = onDocumentUpdated('inviteCodes/{codeId}', async (event) => {
  const change = tierChange(event);
  if (!change || typeof change.after.orgId === 'string') return;
  const updated = await syncMemberTiers('groupId', event.params.codeId, change.tier);
  console.log(`Lyft'd access ${event.params.codeId} moved to tier ${change.tier}; updated ${updated} member(s).`);
});

exports.getCourseMediaUrl = onCall({serviceAccount: 'course-media@belyft-d-app.iam.gserviceaccount.com'}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before requesting course media.');
  }

  const {moduleId, unitId, mediaType, storagePath} = request.data ?? {};
  if (
    typeof moduleId !== 'string' ||
    !/^[A-Za-z0-9_-]{1,80}$/.test(moduleId) ||
    typeof unitId !== 'string' ||
    !/^[A-Za-z0-9_-]{1,80}$/.test(unitId) ||
    !['audio', 'video'].includes(mediaType) ||
    typeof storagePath !== 'string'
  ) {
    throw new HttpsError('invalid-argument', 'The requested course media is invalid.');
  }

  const unitSnapshot = await db.collection('modules').doc(moduleId).collection('units').doc(unitId).get();
  if (!unitSnapshot.exists) {
    throw new HttpsError('not-found', 'The requested course unit was not found.');
  }

  const unit = unitSnapshot.data();
  const tier = request.auth.token.subscriptionTier;
  const moduleMatch = /^module-([1-9][0-9]*)$/.exec(moduleId);
  const moduleNumber = moduleMatch ? Number(moduleMatch[1]) : 0;
  const requiredTier = moduleNumber <= 5 ? 1 : moduleNumber <= 10 ? 2 : 3;
  if (!moduleNumber || ![1, 2, 3, 4].includes(tier) || tier < requiredTier) {
    throw new HttpsError('permission-denied', 'Your subscription does not allow access to this course media.');
  }

  const mediaMap = mediaType === 'audio' ? unit.audioUrls : unit.videoUrls;
  const extension = mediaType === 'audio' ? 'mp3' : 'mp4';
  const expectedPrefix = `course-content/${moduleId}/${unitId}/${mediaType}/`;
  if (
    typeof mediaMap !== 'object' ||
    mediaMap === null ||
    !Object.values(mediaMap).includes(storagePath) ||
    !storagePath.startsWith(expectedPrefix) ||
    !new RegExp(`^[A-Za-z0-9_.-]+\\.${extension}$`).test(storagePath.slice(expectedPrefix.length))
  ) {
    throw new HttpsError('permission-denied', 'The requested file is not part of this course unit.');
  }

  const expires = Date.now() + 10 * 60 * 1000;
  const file = getStorage().bucket('belyft-d-app.firebasestorage.app').file(storagePath);
  const [exists] = await file.exists();
  if (!exists) throw new HttpsError('not-found', 'This recording is not available.');
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires,
    queryParams: {
      'response-cache-control': 'private, max-age=300',
    },
  });
  return {url, expiresAt: expires};
});

// The path is constructed here, never accepted from a client or narration metadata.
exports.getCourseReadingContent = onCall({serviceAccount: 'course-media@belyft-d-app.iam.gserviceaccount.com'}, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to read this lesson.');
  const {moduleId, unitId} = request.data ?? {};
  const match = typeof moduleId === 'string' && /^module-([1-9][0-9]*)$/.exec(moduleId);
  if (!match || typeof unitId !== 'string' || !/^unit-[1-9][0-9]*$/.test(unitId)) {
    throw new HttpsError('invalid-argument', 'Invalid lesson identifiers.');
  }
  const number = Number(match[1]);
  const requiredTier = number <= 5 ? 1 : number <= 10 ? 2 : 3;
  const tier = request.auth.token.subscriptionTier;
  if (![1, 2, 3, 4].includes(tier) || tier < requiredTier) {
    throw new HttpsError('permission-denied', 'This lesson requires an upgraded subscription.');
  }
  const file = getStorage().bucket('belyft-d-app.firebasestorage.app').file(`course-content/${moduleId}/${unitId}/text.json`);
  try {
    const [bytes] = await file.download();
    const reading = JSON.parse(bytes.toString('utf8'));
    if (reading.contentKind !== 'reading' || typeof reading.content !== 'string' || !reading.content.trim() || /[\[\]]/.test(reading.content)) {
      throw new HttpsError('failed-precondition', 'Clean reading content is not available.');
    }
    return {content: reading.content};
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('not-found', 'Reading content is not available.');
  }
});
