const {initializeApp} = require('firebase-admin/app');
const {getAuth} = require('firebase-admin/auth');
const {getFirestore, FieldValue} = require('firebase-admin/firestore');
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
