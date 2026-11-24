import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { createUserRateLimit } from '../src/middleware/userRateLimit.js';

test('sensitive operation limiter is scoped to the authenticated local user', async (t) => {
  const app = express();
  app.use((request, _response, next) => {
    request.eventNestUser = { _id: request.headers['x-test-user'] || 'user-a' };
    next();
  });
  app.post(
    '/sensitive',
    createUserRateLimit({ limit: 2 }),
    (_request, response) => response.sendStatus(204),
  );
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(
    () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  const request = (user) =>
    fetch(`http://127.0.0.1:${server.address().port}/sensitive`, {
      method: 'POST',
      headers: { 'x-test-user': user },
    });
  assert.equal((await request('user-a')).status, 204);
  assert.equal((await request('user-a')).status, 204);
  const blocked = await request('user-a');
  assert.equal(blocked.status, 429);
  assert.deepEqual(await blocked.json(), {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests; try again later',
    },
  });
  assert.equal((await request('user-b')).status, 204);
});
