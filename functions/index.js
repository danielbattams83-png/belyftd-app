const {initializeApp} = require('firebase-admin/app');
const {getAuth} = require('firebase-admin/auth');
const {getFirestore, FieldValue} = require('firebase-admin/firestore');
const {getStorage} = require('firebase-admin/storage');
const {HttpsError, onCall} = require('firebase-functions/v2/https');

initializeApp();

const db = getFirestore();

exports.redeemSponsorCode = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before redeeming a sponsor code.');
  }

  const code = typeof request.data?.code === 'string'
    ? request.data.code.trim().toUpperCase()
    : '';
  if (!/^[A-Z0-9]{6,32}$/.test(code)) {
    throw new HttpsError('invalid-argument', 'Enter a valid sponsor code.');
  }

  const codeSnapshot = await db.collection('inviteCodes').doc(code).get();
  if (!codeSnapshot.exists) {
    throw new HttpsError('not-found', 'This sponsor code is not recognized.');
  }
  const invite = codeSnapshot.data();
  if (
    invite.active !== true ||
    ![1, 2, 3].includes(invite.subscriptionTier) ||
    typeof invite.orgId !== 'string' ||
    typeof invite.sponsorName !== 'string'
  ) {
    throw new HttpsError('failed-precondition', 'This sponsor code is not currently available.');
  }

  const auth = getAuth();
  const user = await auth.getUser(request.auth.uid);
  await auth.setCustomUserClaims(request.auth.uid, {
    ...user.customClaims,
    subscriptionTier: invite.subscriptionTier,
    orgId: invite.orgId,
  });

  await db.collection('sponsorProfiles').doc(request.auth.uid).set({
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
  if (
    ![1, 2, 3].includes(tier) ||
    ![1, 2, 3].includes(unit.minTier) ||
    tier < unit.minTier
  ) {
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
