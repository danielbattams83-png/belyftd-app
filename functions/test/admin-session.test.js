const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createAdminHandlers} = require('../admin-session');

function setup() {
  const store = new Map();
  let time = 1000000;
  let key = 'unit-test-master-key-not-for-deployment';
  class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
  const db = {collection: collection => ({
    doc: id => {
      const path = `${collection}/${id}`;
      return {path,
        get: async () => ({exists: store.has(path), data: () => store.get(path)}),
        set: async (value, options) => store.set(path, options?.merge ? {...store.get(path), ...value} : value),
        delete: async () => store.delete(path),
      };
    },
    get: async () => ({docs: [...store].filter(([path]) => path.startsWith(`${collection}/`)).map(([path, value]) => ({id: path.split('/')[1], data: () => value}))}),
  }), runTransaction: async callback => callback({get: ref => ref.get(), set: (ref, value) => ref.set(value)})};
  const handlers = createAdminHandlers({db, masterKey: () => key, HttpsError, now: () => time});
  return {handlers, store, login: () => handlers.login({data: {passkey: key}, rawRequest: {ip: '127.0.0.1'}}),
    expire: () => { time += 12 * 60 * 60 * 1000; }, rotate: () => { key = 'a-different-private-master-key'; }, unconfigure: () => {key = '';}};
}

test('issues a random session, stores only its hash, and never touches student collections', async () => {
  const app = setup();
  const session = await app.login();
  assert.match(session.sessionToken, /^[a-f0-9]{64}$/);
  assert.equal((await app.handlers.validate({data: session})).authenticated, true);
  assert.ok([...app.store.keys()].every(path => path.startsWith('superAdmin')));
  assert.ok(!JSON.stringify([...app.store]).includes(session.sessionToken));
});

test('rejects invalid keys and throttles subsequent attempts', async () => {
  const app = setup();
  for (let i = 0; i < 5; i++) {
    await assert.rejects(app.handlers.login({data: {passkey: 'wrong'}, rawRequest: {ip: '127.0.0.1'}}), {code: 'permission-denied'});
  }
  await assert.rejects(app.login(), {code: 'resource-exhausted'});
});

test('fails closed with no configured secret', async () => {
  const app = setup(); app.unconfigure();
  await assert.rejects(app.login(), {code: 'failed-precondition'});
});

test('rejects forged sessions and standard Firebase accounts', async () => {
  const app = setup();
  for (const request of [{data: {authenticated: true}}, {auth: {uid: 'student'}, data: {}}, {data: {sessionToken: 'f'.repeat(64)}}]) {
    await assert.rejects(app.handlers.validate(request), {code: 'unauthenticated'});
    await assert.rejects(app.handlers.listPartners(request), {code: 'unauthenticated'});
    await assert.rejects(app.handlers.savePartner(request), {code: 'unauthenticated'});
  }
});

test('revokes logout on the server', async () => {
  const app = setup(); const data = await app.login();
  await app.handlers.logout({data});
  await assert.rejects(app.handlers.validate({data}), {code: 'unauthenticated'});
});

test('expires sessions and invalidates them when the master key changes', async () => {
  const expired = setup(); const first = await expired.login(); expired.expire();
  await assert.rejects(expired.handlers.validate({data: first}), {code: 'unauthenticated'});
  const rotated = setup(); const second = await rotated.login(); rotated.rotate();
  await assert.rejects(rotated.handlers.validate({data: second}), {code: 'unauthenticated'});
});

test('authorizes and validates partner writes without letting clients replace analytics', async () => {
  const app = setup(); const session = await app.login();
  app.store.set('partners/crew', {analytics: {totalRedemptions: 27}});
  const partner = {id: 'crew', organizationName: 'Crew', active: true, subscriptionTier: 4, branding: {}, redemptionCodes: ['CREW2026'], analytics: {totalRedemptions: 0}};
  await app.handlers.savePartner({data: {...session, partner}});
  assert.equal(app.store.get('partners/crew').analytics.totalRedemptions, 27);
  assert.equal((await app.handlers.listPartners({data: session}))[0].id, 'crew');
  for (const changes of [{id: '../users'}, {websiteUrl: 'javascript:alert(1)'}, {redemptionCodes: ['x']}, {branding: {logoUrl: 'javascript:alert(1)'}}]) {
    await assert.rejects(app.handlers.savePartner({data: {...session, partner: {...partner, ...changes}}}), {code: 'invalid-argument'});
  }
});
