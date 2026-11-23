import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadConfig } from '../src/config.js';

test('loads a valid MongoDB URI and default port', () => {
  assert.deepEqual(loadConfig({ MONGODB_URI: ' mongodb://localhost:27017/eventnest ' }), {
    port: 4000,
    mongodbUri: 'mongodb://localhost:27017/eventnest',
  });
});

test('rejects missing MongoDB URI', () => {
  assert.throws(() => loadConfig({}), /MONGODB_URI is required/);
});

test('rejects invalid ports', () => {
  for (const port of ['0', '65536', 'abc', '1.5']) {
    assert.throws(() => loadConfig({ PORT: port, MONGODB_URI: 'mongodb://localhost/test' }), /PORT must/);
  }
});
