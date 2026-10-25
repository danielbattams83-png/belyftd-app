const {initializeApp} = require('firebase-admin/app');
const {getAuth} = require('firebase-admin/auth');
const {getFirestore, FieldValue} = require('firebase-admin/firestore');
const {getStorage} = require('firebase-admin/storage');
const {HttpsError, onCall} = require('firebase-functions/v2/https');

initializeApp();

const db = getFirestore();

async function findInviteCode(code) {
  const snapshot = await db.collection('inviteCodes').doc(code).get();
  return snapshot.exists ? snapshot.data() : null;
}

// Codes managed in the Sponsor Admin are stored on partners/{id}.redemptionCodes.
async function findPartnerRedemptionCode(code) {
  const snapshot = await db.collection('partners')
    .where('redemptionCodes', 'array-contains', code)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const partnerDoc = snapshot.docs[0];
  const partner = partnerDoc.data();
  return {
    active: partner.active,
    subscriptionTier: partner.subscriptionTier,
    orgId: partnerDoc.id,
    sponsorName: partner.organizationName,
  };
}

async function getValidSponsorInvite(value) {
  const code = typeof value === 'string'
    ? value.trim().toUpperCase()
    : '';
  if (!/^[A-Z0-9-]{6,32}$/.test(code)) {
    throw new HttpsError('invalid-argument', 'Enter a valid sponsor code.');
  }

  const invite = await findInviteCode(code) ?? await findPartnerRedemptionCode(code);
  if (!invite) {
    throw new HttpsError('not-found', 'This sponsor code is not recognized.');
  }
  if (
    invite.active !== true ||
    ![1, 2, 3, 4].includes(invite.subscriptionTier) ||
    typeof invite.orgId !== 'string' ||
    typeof invite.sponsorName !== 'string'
  ) {
    throw new HttpsError('failed-precondition', 'This sponsor code is not currently available.');
  }

  return {code, invite};
}

// orgId is safe to return pre-auth: partner documents (design only) are already public-read.
exports.checkSponsorCode = onCall({maxInstances: 5}, async (request) => {
  const {invite} = await getValidSponsorInvite(request.data?.code);
  return {valid: true, orgId: invite.orgId};
});

exports.redeemSponsorCode = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before redeeming a sponsor code.');
  }
  if (request.auth.token?.firebase?.sign_in_provider === 'anonymous') {
    throw new HttpsError('unauthenticated', 'Create an account before redeeming a sponsor code.');
  }
  const {code, invite} = await getValidSponsorInvite(request.data?.code);

  // An account belongs to exactly one partner template; another partner's code cannot move it.
  const profileRef = db.collection('sponsorProfiles').doc(request.auth.uid);
  const existing = await profileRef.get();
  if (existing.exists && existing.data().orgId !== invite.orgId) {
    throw new HttpsError('permission-denied', 'This account is already connected to another partner.');
  }

  const auth = getAuth();
  const user = await auth.getUser(request.auth.uid);
  await auth.setCustomUserClaims(request.auth.uid, {
    ...user.customClaims,
    subscriptionTier: invite.subscriptionTier,
    orgId: invite.orgId,
  });

  await profileRef.set({
    orgId: invite.orgId,
    sponsorName: invite.sponsorName,
    subscriptionTier: invite.subscriptionTier,
    codeId: code,
    redeemedAt: FieldValue.serverTimestamp(),
  });

  return {
    orgId: invite.orgId,
    sponsorName: invite.sponsorName,
    subscriptionTier: invite.subscriptionTier,
    codeId: code,
  };
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
