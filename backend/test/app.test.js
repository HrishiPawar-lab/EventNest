import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app.js';

let server;
let baseUrl;

before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('health endpoint responds without exposing Express version', async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('unknown routes return a safe JSON error', async () => {
  const response = await fetch(`${baseUrl}/missing`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

test('malformed JSON is rejected without exposing parser details', async () => {
  const response = await fetch(`${baseUrl}/health`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{invalid',
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: { code: 'BAD_REQUEST', message: 'Invalid request body' } });
});

test('oversized JSON is rejected with a safe error', async () => {
  const response = await fetch(`${baseUrl}/health`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ value: 'x'.repeat(102_400) }),
  });
  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' } });
});

test('unsupported request encoding is rejected with a safe error', async () => {
  const response = await fetch(`${baseUrl}/health`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'content-encoding': 'compress' },
    body: '{}',
  });
  assert.equal(response.status, 415);
  assert.deepEqual(await response.json(), { error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Unsupported request encoding' } });
});
