const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup({exists = true, tier = 3, minTier = 3, moduleNumber = 5, unitExists = true, reading = {contentKind: 'reading', content: 'H - stands for hope.'}} = {}) {
  const storagePath = `course-content/module-${moduleNumber}/unit-2/audio/hope-sophie--english.mp3`;
  let signed = false;
  const modules = {
    'firebase-admin/app': {initializeApp() {}},
    'firebase-admin/auth': {getAuth() {}},
    'firebase-admin/firestore': {FieldValue: {}, getFirestore: () => ({
      collection: () => ({doc: () => ({collection: () => ({doc: () => ({get: async () => ({
        exists: unitExists, data: () => ({minTier, audioUrls: {'Sophie (English)': storagePath}}),
      })})})})}),
    })},
    'firebase-admin/storage': {getStorage: () => ({bucket: bucket => {
      assert.equal(bucket, 'belyft-d-app.firebasestorage.app');
      return {file: filePath => {
        if (filePath.endsWith('/text.json')) {
          assert.equal(filePath, `course-content/module-${moduleNumber}/unit-2/text.json`);
          return {download: async () => [Buffer.from(JSON.stringify(reading))]};
        }
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
    'firebase-functions/v2/firestore': {onDocumentUpdated: (...args) => args.at(-1)},
  };
  const exports = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../index.js'), 'utf8'), {
    require: name => modules[name], exports, Date,
  });
  return {
    handler: exports.getCourseMediaUrl,
    readingHandler: exports.getCourseReadingContent,
    request: {auth: {uid: 'test-user', token: {subscriptionTier: tier}}, data: {
      moduleId: `module-${moduleNumber}`, unitId: 'unit-2', mediaType: 'audio', storagePath,
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
  const {handler, request, wasSigned} = setup({tier: 1, moduleNumber: 11});
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

test('Enterprise accounts can access Impact and Enterprise media', async () => {
  for (const minTier of [3, 4]) {
    const {handler, request, wasSigned} = setup({tier: 4, minTier});
    await handler(request);
    assert.equal(wasSigned(), true);
  }
});

test('rejects unsupported subscription claims and full curriculum media for lower tiers', async () => {
  for (const tier of [0, 2, 5, '4']) {
    const {handler, request, wasSigned} = setup({tier, minTier: 4, moduleNumber: 11});
    await assert.rejects(handler(request), error => error.code === 'permission-denied');
    assert.equal(wasSigned(), false);
  }
});

for (const tier of [1, 2, 3, 4]) {
  test(`module caps enforced for Tier ${tier}, independent of legacy minTier`, async () => {
    for (const moduleNumber of [1, 5, 6, 10, 11, 21, 22]) {
      const allowed = tier >= 3 || (tier === 2 && moduleNumber <= 10) || moduleNumber <= 5;
      const {handler, readingHandler, request, wasSigned} = setup({tier, moduleNumber, minTier: allowed ? 4 : 1});
      if (allowed) await handler(request);
      else await assert.rejects(handler(request), error => error.code === 'permission-denied');
      assert.equal(wasSigned(), allowed);
      if (allowed) assert.equal((await readingHandler(request)).content, 'H - stands for hope.');
      else await assert.rejects(readingHandler(request), error => error.code === 'permission-denied');
    }
  });
}

test('reading endpoint accepts only canonical reading JSON', async () => {
  const {readingHandler, request} = setup();
  const result = await readingHandler({...request, data: {...request.data, storagePath: 'script_elevenlabs.txt'}});
  assert.equal(result.content, 'H - stands for hope.');
});

test('reading endpoint rejects scripts, dirty JSON, and insufficient tiers', async () => {
  for (const reading of [{contentKind: 'narration', content: 'Script'}, {contentKind: 'reading', content: '[Tone: Warm] Hello'}, {contentKind: 'reading', content: ''}]) {
    const {readingHandler, request} = setup({reading});
    await assert.rejects(readingHandler(request), error => error.code === 'failed-precondition');
  }
  const {readingHandler, request} = setup({tier: 1, moduleNumber: 11});
  await assert.rejects(readingHandler(request), error => error.code === 'permission-denied');
  await assert.rejects(readingHandler({...request, auth: null}), error => error.code === 'unauthenticated');
});
