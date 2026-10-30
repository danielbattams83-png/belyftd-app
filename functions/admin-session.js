const {createHash, randomBytes, timingSafeEqual} = require('node:crypto');

const SESSION_DURATION = 12 * 60 * 60 * 1000;
const RATE_WINDOW = 15 * 60 * 1000;
const digest = value => createHash('sha256').update(value).digest();

function createAdminHandlers({db, auth, masterKey, HttpsError, now = Date.now}) {
  const fail = (code, message) => { throw new HttpsError(code, message); };
  const configuredKey = () => {
    const key = masterKey();
    if (typeof key !== 'string' || key.length < 16) {
      fail('failed-precondition', 'Super-admin access has not been configured.');
    }
    return key;
  };
  const sessionRef = token => {
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
      fail('unauthenticated', 'Admin sign-in required.');
    }
    return db.collection('superAdminSessions').doc(digest(token).toString('hex'));
  };
  async function requireSession(request) {
    const ref = sessionRef(request.data?.sessionToken);
    const snapshot = await ref.get();
    const session = snapshot.data();
    if (!snapshot.exists || !session || session.expiresAt <= now() ||
      session.keyDigest !== digest(configuredKey()).toString('hex')) {
      fail('unauthenticated', 'Admin session expired. Sign in again.');
    }
    return {ref, session};
  }
  async function limitAttempts(request) {
    // Firestore transactions keep throttling effective across function instances.
    const ip = request.rawRequest?.ip || 'unknown';
    const refs = [
      {ref: db.collection('superAdminAttempts').doc(digest(ip).toString('hex')), limit: 5},
      {ref: db.collection('superAdminAttempts').doc('global'), limit: 100},
    ];
    await db.runTransaction(async tx => {
      const snapshots = await Promise.all(refs.map(({ref}) => tx.get(ref)));
      const states = snapshots.map(snapshot => {
        const previous = snapshot.data();
        return previous && previous.resetAt > now() ? previous : {count: 0, resetAt: now() + RATE_WINDOW};
      });
      if (states.some((state, index) => state.count >= refs[index].limit)) {
        fail('resource-exhausted', 'Too many attempts. Try again in 15 minutes.');
      }
      refs.forEach(({ref}, index) => tx.set(ref, {...states[index], count: states[index].count + 1}));
    });
  }
  function normalizePartner(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
      typeof value.id !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,79}$/.test(value.id) ||
      typeof value.organizationName !== 'string' || !value.organizationName.trim() || value.organizationName.length > 200 ||
      typeof value.active !== 'boolean' || ![1, 2, 3, 4].includes(value.subscriptionTier) ||
      !value.branding || typeof value.branding !== 'object' || Array.isArray(value.branding) ||
      !Array.isArray(value.redemptionCodes) || value.redemptionCodes.length > 100 ||
      value.redemptionCodes.some(code => typeof code !== 'string' || !/^[A-Z0-9_-]{6,32}$/.test(code))) {
      fail('invalid-argument', 'Invalid partner details or access codes (6–32 letters, numbers, hyphens or underscores).');
    }
    const text = (value, max) => {
      if (value === undefined) return '';
      if (typeof value !== 'string' || value.length > max) fail('invalid-argument', 'Partner field exceeds its allowed length.');
      return value.trim();
    };
    const websiteUrl = text(value.websiteUrl, 2048);
    if (websiteUrl) {
      try { if (!['https:', 'http:'].includes(new URL(websiteUrl).protocol)) throw new Error(); }
      catch { fail('invalid-argument', 'Enter a valid HTTP or HTTPS website URL.'); }
    }
    const branding = {};
    for (const key of ['logoUrl', 'themeId', 'primaryColor', 'accentColor', 'backgroundColor', 'surfaceColor', 'textOnHeroColor', 'welcomeHeadline', 'welcomeSubtext', 'sponsorBadgeText', 'customPartnerTabName']) {
      if (value.branding[key] !== undefined) branding[key] = text(value.branding[key], key === 'logoUrl' ? 500000 : 2000);
    }
    if (branding.logoUrl && !/^(https?:\/\/|\/(?!\/)|data:image\/(png|jpeg|webp|gif);base64,)/i.test(branding.logoUrl)) {
      fail('invalid-argument', 'Use an HTTP(S) logo URL or a PNG, JPEG, WebP or GIF image.');
    }
    return {id: value.id, organizationName: value.organizationName.trim(), contactEmail: text(value.contactEmail, 320),
      websiteUrl, subscriptionTier: value.subscriptionTier, active: value.active, branding,
      redemptionCodes: [...new Set(value.redemptionCodes)]};
  }
  return {
    async login(request) {
      const key = configuredKey();
      const passkey = request.data?.passkey;
      if (typeof passkey !== 'string' || passkey.length > 512) fail('invalid-argument', 'Invalid passcode.');
      await limitAttempts(request);
      if (!timingSafeEqual(digest(passkey.trim()), digest(key))) fail('permission-denied', 'Invalid admin passcode. Access denied.');
      const sessionToken = randomBytes(32).toString('hex');
      const expiresAt = now() + SESSION_DURATION;
      await sessionRef(sessionToken).set({createdAt: now(), expiresAt, deleteAfter: new Date(expiresAt), keyDigest: digest(key).toString('hex')});
      return {sessionToken, expiresAt};
    },
    async validate(request) {
      const {session} = await requireSession(request);
      return {authenticated: true, expiresAt: session.expiresAt};
    },
    async logout(request) {
      await sessionRef(request.data?.sessionToken).delete();
      return {authenticated: false};
    },
    async listPartners(request) {
      await requireSession(request);
      const snapshot = await db.collection('partners').get();
      return snapshot.docs.map(doc => ({...doc.data(), id: doc.id}))
        .sort((a, b) => (a.organizationName || a.id).localeCompare(b.organizationName || b.id));
    },
    async savePartner(request) {
      await requireSession(request);
      const partner = normalizePartner(request.data?.partner);
      // Analytics are server-owned; admin branding edits must not overwrite counters.
      await db.collection('partners').doc(partner.id).set(partner, {merge: true});
      return {saved: true};
    },
    async firebaseToken(request) {
      await requireSession(request);
      if (!auth) fail('failed-precondition', 'Admin media authentication is unavailable.');
      return {
        customToken: await auth.createCustomToken('super-admin-media-cms', {superAdmin: true, subscriptionTier: 4}),
      };
    },
  };
}
module.exports = {createAdminHandlers};
