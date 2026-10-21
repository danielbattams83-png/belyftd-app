const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup({exists = true, tier = 3, unitExists = true} = {}) {
  const storagePath = 'course-content/module-5/unit-2/audio/hope-sophie--english.mp3';
  let signed = false;
  const modules = {
    'firebase-admin/app': {initializeApp() {}},
    'firebase-admin/auth': {getAuth() {}},
    'firebase-admin/firestore': {FieldValue: {}, getFirestore: () => ({
      collection: () => ({doc: () => ({collection: () => ({doc: () => ({get: async () => ({
        exists: unitExists, data: () => ({minTier: 3, audioUrls: {'Sophie (English)': storagePath}}),
      })})})})}),
    })},
    'firebase-admin/storage': {getStorage: () => ({bucket: bucket => {
      assert.equal(bucket, 'belyft-d-app.firebasestorage.app');
      return {file: filePath => {
        assert.equal(filePath, storagePath);
        return {exists: async () => [exists], getSignedUrl: async options => {
          signed = true;
          assert.equal(options.version, 'v4');
          assert.equal(options.action, 'read');
          assert.ok(options.expires > Date.now());
          assert.ok(options.expires <= Date.now() + 600000);
          return ['https://storage.googleapis.com/signed-recording'];
        }};
      }};
    }})},
    'firebase-functions/v2/https': {
      HttpsError: class extends Error { constructor(code, message) { super(message); this.code = code; } },
      onCall: (...args) => args.at(-1),
    },
  };
  const exports = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../index.js'), 'utf8'), {
    require: name => modules[name], exports, Date,
  });
  return {
    handler: exports.getCourseMediaUrl,
    request: {auth: {uid: 'test-user', token: {subscriptionTier: tier}}, data: {
      moduleId: 'module-5', unitId: 'unit-2', mediaType: 'audio', storagePath,
    }},
    wasSigned: () => signed,
  };
}

test('signs only an existing, registered media object for ten minutes', async () => {
  const {handler, request, wasSigned} = setup();
  const result = await handler(request);
  assert.ok(result.url.startsWith('https://storage.googleapis.com/'));
  assert.equal(wasSigned(), true);
});

test('rejects missing objects without signing them', async () => {
  const {handler, request, wasSigned} = setup({exists: false});
  await assert.rejects(handler(request), error => error.code === 'not-found');
  assert.equal(wasSigned(), false);
});

test('rejects unauthenticated and insufficient-tier requests', async () => {
  const {handler, request, wasSigned} = setup({tier: 1});
  await assert.rejects(handler({...request, auth: null}), error => error.code === 'unauthenticated');
  await assert.rejects(handler(request), error => error.code === 'permission-denied');
  assert.equal(wasSigned(), false);
});

test('rejects unregistered placeholders and cross-unit paths', async () => {
  const {handler, request, wasSigned} = setup();
  for (const storagePath of ['', 'legacy/tts.mp3', 'course-content/module-1/unit-1/audio/sophie.mp3']) {
    await assert.rejects(handler({...request, data: {...request.data, storagePath}}), error => error.code === 'permission-denied');
  }
  assert.equal(wasSigned(), false);
});
