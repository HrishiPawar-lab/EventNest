import { Buffer } from 'node:buffer';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { test } from 'node:test';
import mongoose from 'mongoose';
import { createMediaService } from './service.js';

const organizerId = new mongoose.Types.ObjectId();
const venueId = new mongoose.Types.ObjectId().toString();
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);

function uploadStream(callback, publicId = 'eventnest/venues/new') {
  return new Writable({
    write(_chunk, _encoding, done) {
      done();
    },
    final(done) {
      callback(null, {
        secure_url: `https://example.com/${publicId}.png`,
        public_id: publicId,
      });
      done();
    },
  });
}

function venueStore() {
  const state = {
    organizerId,
    imageUrl: 'https://example.com/old.png',
    imagePublicId: 'eventnest/venues/old',
  };
  return {
    state,
    model: {
      async findById() {
        return { ...state };
      },
      async findOneAndUpdate(filter, change) {
        if (filter.imagePublicId !== state.imagePublicId) return null;
        if (change.$set) Object.assign(state, change.$set);
        if (change.$unset) {
          delete state.imageUrl;
          delete state.imagePublicId;
        }
        return { ...state };
      },
    },
  };
}

test('trusted Cloudinary upload stores paired cover fields and removes old asset', async () => {
  const calls = [];
  const { model, state } = venueStore();
  const service = createMediaService({
    configured: true,
    venueModel: model,
    client: {
      uploader: {
        upload_stream(options, callback) {
          calls.push(['upload', options.folder]);
          return uploadStream(callback);
        },
        async destroy(id) {
          calls.push(['destroy', id]);
          return { result: 'ok' };
        },
      },
    },
  });
  assert.deepEqual(
    await service.replace('venue', venueId, organizerId, png, 'image/png'),
    {
      imageUrl: 'https://example.com/eventnest/venues/new.png',
    },
  );
  assert.equal(state.imagePublicId, 'eventnest/venues/new');
  assert.deepEqual(calls[1], ['destroy', 'eventnest/venues/old']);
});

test('media service rejects invalid content and foreign ownership before upload', async () => {
  let uploads = 0;
  const service = createMediaService({
    configured: true,
    venueModel: {
      async findById() {
        return { organizerId: new mongoose.Types.ObjectId() };
      },
    },
    client: {
      uploader: {
        upload_stream() {
          uploads += 1;
        },
      },
    },
  });
  await assert.rejects(
    () =>
      service.replace(
        'venue',
        venueId,
        organizerId,
        Buffer.from('text'),
        'image/png',
      ),
    { status: 400 },
  );
  await assert.rejects(
    () => service.replace('venue', venueId, organizerId, png, 'image/png'),
    { status: 403 },
  );
  assert.equal(uploads, 0);
  const unavailable = createMediaService({ configured: false });
  await assert.rejects(
    () => unavailable.replace('venue', venueId, organizerId, png, 'image/png'),
    { status: 503 },
  );
});

test('database update failure removes the new asset before propagating', async () => {
  const destroyed = [];
  const service = createMediaService({
    configured: true,
    venueModel: {
      async findById() {
        return { organizerId };
      },
      async findOneAndUpdate() {
        throw new Error('db failed');
      },
    },
    client: {
      uploader: {
        upload_stream(_options, callback) {
          return uploadStream(callback, 'new-id');
        },
        async destroy(id) {
          destroyed.push(id);
          return { result: 'ok' };
        },
      },
    },
  });
  await assert.rejects(
    () => service.replace('venue', venueId, organizerId, png, 'image/png'),
    /db failed/,
  );
  assert.deepEqual(destroyed, ['new-id']);
});

test('malformed Cloudinary upload response cleans up a supplied public ID', async () => {
  const destroyed = [];
  const { model } = venueStore();
  const service = createMediaService({
    configured: true,
    venueModel: model,
    client: {
      uploader: {
        upload_stream(_options, callback) {
          return new Writable({
            write(_chunk, _encoding, done) {
              done();
            },
            final(done) {
              callback(null, {
                secure_url: 'http://insecure',
                public_id: 'bad-upload',
              });
              done();
            },
          });
        },
        async destroy(id) {
          destroyed.push(id);
          return { result: 'ok' };
        },
      },
    },
  });
  await assert.rejects(
    () => service.replace('venue', venueId, organizerId, png, 'image/png'),
    { status: 502 },
  );
  assert.deepEqual(destroyed, ['bad-upload']);
});

test('concurrent cover replacement cannot overwrite a newer image', async () => {
  const { model, state } = venueStore();
  const callbacks = [];
  const destroyed = [];
  let uploadCount = 0;
  const service = createMediaService({
    configured: true,
    venueModel: model,
    client: {
      uploader: {
        upload_stream(_options, callback) {
          const id = `new-${++uploadCount}`;
          return new Writable({
            write(_chunk, _encoding, done) {
              done();
            },
            final(done) {
              callbacks.push(() => {
                callback(null, {
                  secure_url: `https://example.com/${id}.png`,
                  public_id: id,
                });
                done();
              });
              if (callbacks.length === 2)
                callbacks.forEach((release) => release());
            },
          });
        },
        async destroy(id) {
          destroyed.push(id);
          return { result: 'ok' };
        },
      },
    },
  });
  const results = await Promise.allSettled([
    service.replace('venue', venueId, organizerId, png, 'image/png'),
    service.replace('venue', venueId, organizerId, png, 'image/png'),
  ]);
  assert.equal(
    results.filter((result) => result.status === 'fulfilled').length,
    1,
  );
  assert.equal(
    results.filter(
      (result) =>
        result.status === 'rejected' && result.reason.code === 'COVER_CHANGED',
    ).length,
    1,
  );
  assert.ok(['new-1', 'new-2'].includes(state.imagePublicId));
  assert.ok(destroyed.includes('eventnest/venues/old'));
  assert.ok(
    destroyed.includes(state.imagePublicId === 'new-1' ? 'new-2' : 'new-1'),
  );
});
