const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup({exists = true, invite = {active: true, subscriptionTier: 4, orgId: 'test-org', sponsorName: 'Test sponsor'}, partners = [], sponsorProfile = null} = {}) {
  const writes = [];
  const reads = [];
  const claims = [];
  const partnerQuery = code => ({limit: () => ({get: async () => {
    const docs = partners
      .filter(partner => partner.redemptionCodes.includes(code))
      .map(partner => ({id: partner.id, data: () => partner}));
    return {empty: docs.length === 0, docs};
  }})});
  const modules = {
    'firebase-admin/app': {initializeApp() {}},
    'firebase-admin/auth': {getAuth: () => ({
      getUser: async () => ({customClaims: {existing: true}}),
      setCustomUserClaims: async (uid, values) => claims.push({uid, values}),
    })},
    'firebase-admin/firestore': {
      FieldValue: {serverTimestamp: () => 'timestamp'},
      getFirestore: () => ({collection: collection => ({
        doc: id => ({
          get: async () => {
            if (collection === 'sponsorProfiles') return {exists: sponsorProfile !== null, data: () => sponsorProfile};
            reads.push({collection, id});
            return {exists, data: () => invite};
          },
          set: async data => writes.push({collection, id, data}),
        }),
        where: (_field, _op, code) => partnerQuery(code),
      })}),
    },
    'firebase-admin/storage': {getStorage() {}},
    'firebase-functions/v2/https': {
      HttpsError: class extends Error {constructor(code, message) { super(message); this.code = code; }},
      onCall: (...args) => args.at(-1),
    },
  };
  const exports = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../index.js'), 'utf8'), {require: name => modules[name], exports, Date});
  return {...exports, writes, reads, claims};
}

test('pre-auth check normalizes codes, exposes only the public partner id, and grants nothing', async () => {
  const app = setup();
  const result = await app.checkSponsorCode({data: {code: ' phoenix100 '}});
  assert.deepEqual(Object.keys(result), ['valid', 'orgId']);
  assert.equal(result.valid, true);
  assert.equal(result.orgId, 'test-org');
  assert.deepEqual(app.reads, [{collection: 'inviteCodes', id: 'PHOENIX100'}]);
  assert.equal(app.writes.length, 0);
  assert.equal(app.claims.length, 0);
});

test('rejects malformed, unknown, inactive and invalid-tier codes before unlocking', async () => {
  const app = setup();
  for (const code of ['', 'abc', '../PHOENIX100', 123, 'A'.repeat(33)]) {
    await assert.rejects(app.checkSponsorCode({data: {code}}), error => error.code === 'invalid-argument');
  }
  assert.equal(app.reads.length, 0);
  await assert.rejects(setup({exists: false}).checkSponsorCode({data: {code: 'UNKNOWN123'}}), error => error.code === 'not-found');
  for (const invite of [
    {active: false, subscriptionTier: 4, orgId: 'org', sponsorName: 'Sponsor'},
    {active: true, subscriptionTier: 5, orgId: 'org', sponsorName: 'Sponsor'},
    {active: true, subscriptionTier: 4},
  ]) {
    await assert.rejects(setup({invite}).checkSponsorCode({data: {code: 'PHOENIX100'}}), error => error.code === 'failed-precondition');
  }
});

test('redemption still requires authentication and revalidates before granting access', async () => {
  const app = setup();
  await assert.rejects(app.redeemSponsorCode({data: {code: 'PHOENIX100'}}), error => error.code === 'unauthenticated');
  assert.equal(app.reads.length, 0);
  await app.redeemSponsorCode({auth: {uid: 'member'}, data: {code: 'PHOENIX100'}});
  assert.equal(app.claims[0].values.subscriptionTier, 4);
  assert.equal(app.claims[0].values.existing, true);
  assert.equal(app.writes[0].collection, 'sponsorProfiles');
  assert.equal(app.writes[0].id, 'member');
  assert.equal(app.writes[0].data.codeId, 'PHOENIX100');
  await assert.rejects(setup({exists: false}).redeemSponsorCode({auth: {uid: 'member'}, data: {code: 'PHOENIX100'}}), error => error.code === 'not-found');
});

test('accepts codes managed on partner documents, including hyphenated codes', async () => {
  const partners = [{id: 'harbour-city-rowing', organizationName: 'Harbour City Rowing Club', subscriptionTier: 4, active: true, redemptionCodes: ['HARBOUR2026', 'HCRC-SQUAD']}];
  const app = setup({exists: false, partners});
  assert.equal((await app.checkSponsorCode({data: {code: 'hcrc-squad'}})).valid, true);
  const result = await app.redeemSponsorCode({auth: {uid: 'member'}, data: {code: 'HARBOUR2026'}});
  assert.equal(result.orgId, 'harbour-city-rowing');
  assert.equal(result.sponsorName, 'Harbour City Rowing Club');
  assert.equal(app.writes[0].data.codeId, 'HARBOUR2026');
  await assert.rejects(setup({exists: false, partners: [{...partners[0], active: false}]}).checkSponsorCode({data: {code: 'HARBOUR2026'}}), error => error.code === 'failed-precondition');
});

test('locks an account to the partner it first redeemed with', async () => {
  const locked = setup({sponsorProfile: {orgId: 'other-org'}});
  await assert.rejects(locked.redeemSponsorCode({auth: {uid: 'member'}, data: {code: 'PHOENIX100'}}), error => error.code === 'permission-denied');
  assert.equal(locked.claims.length, 0);
  assert.equal(locked.writes.length, 0);

  const same = setup({sponsorProfile: {orgId: 'test-org'}});
  await same.redeemSponsorCode({auth: {uid: 'member'}, data: {code: 'PHOENIX100'}});
  assert.equal(same.claims[0].values.orgId, 'test-org');
});

test('anonymous guest sessions cannot redeem codes', async () => {
  const app = setup();
  const auth = {uid: 'guest', token: {firebase: {sign_in_provider: 'anonymous'}}};
  await assert.rejects(app.redeemSponsorCode({auth, data: {code: 'PHOENIX100'}}), error => error.code === 'unauthenticated');
  assert.equal(app.claims.length, 0);
});
