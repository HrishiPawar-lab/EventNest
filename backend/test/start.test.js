import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:net';
import { startServer } from '../src/start.js';

test('closes MongoDB connection when HTTP port is already in use', async () => {
  const occupied = createServer().listen(0);
  await new Promise((resolve) => occupied.once('listening', resolve));

  const calls = [];
  try {
    await assert.rejects(
      startServer(
        { port: occupied.address().port, mongodbUri: 'mongodb://unused' },
        {
          connect: async () => { calls.push('connect'); },
          disconnect: async () => { calls.push('disconnect'); },
        },
      ),
      { code: 'EADDRINUSE' },
    );
    assert.deepEqual(calls, ['connect', 'disconnect']);
  } finally {
    await new Promise((resolve, reject) => occupied.close((error) => error ? reject(error) : resolve()));
  }
});
