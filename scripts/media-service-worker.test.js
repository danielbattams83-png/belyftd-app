const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function worker(fetchImpl, caches) {
  const handlers = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/sw.js'), 'utf8'), {
    self: {addEventListener: (event, fn) => handlers[event] = fn, clients: {claim: async () => {}}},
    caches, fetch: fetchImpl, URL, console,
  });
  return handlers;
}

test('passes media and Range requests to the network without caching', async () => {
  let received;
  const request = {method: 'GET', url: 'https://storage.googleapis.com/bucket/lesson.mp3?X-Goog-Signature=test', headers: {Range: 'bytes=0-1023'}};
  const handlers = worker(async req => { received = req; return {status: 206}; }, {open: () => { throw new Error('Media must not be cached'); }});
  let response;
  handlers.fetch({request, respondWith: promise => response = promise});
  assert.equal((await response).status, 206);
  assert.equal(received, request);
});

test('deletes the previous audio cache on activation', async () => {
  const deleted = [];
  const handlers = worker(() => {}, {
    keys: async () => ['belyftd-audio-v1', 'lyftd-pwa-v4', 'lyftd-pwa-v5'],
    delete: async key => deleted.push(key),
  });
  let activation;
  handlers.activate({waitUntil: promise => activation = promise});
  await activation;
  assert.deepEqual(deleted, ['belyftd-audio-v1', 'lyftd-pwa-v4']);
});

test('preserves network failures instead of fabricating empty successful audio', async () => {
  const handlers = worker(async () => { throw new Error('Offline'); }, {});
  let response;
  handlers.fetch({request: {method: 'GET', url: 'https://storage.googleapis.com/bucket/lesson.mp3'}, respondWith: promise => response = promise});
  await assert.rejects(response, /Offline/);
});
