import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { test } from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { Event } from '../src/models/Event.js';
import { Venue } from '../src/models/Venue.js';
import {
  buildSeedPlan,
  parseOptions,
  runSeed,
  seedId,
} from '../scripts/seed-demo-events.js';

const organizerId = new mongoose.Types.ObjectId();

test('the original eight event cards form valid owned venues and draft events', async () => {
  const plan = buildSeedPlan();
  assert.equal(plan.length, 8);
  assert.equal(new Set(plan.map((item) => String(item.venueData._id))).size, 8);
  assert.equal(new Set(plan.map((item) => String(item.eventData._id))).size, 8);
  assert.deepEqual(
    plan.map((item) => item.slug),
    [
      'afterglow-live',
      'makers-summit',
      'street-food-social',
      'art-in-motion',
      'city-derby',
      'weekend-workshop',
      'night-shift-sessions',
      'jazz-by-the-bay',
    ],
  );
  for (const item of plan) {
    const venue = new Venue({ ...item.venueData, organizerId });
    const event = new Event({
      ...item.eventData,
      organizerId,
      location: {
        city: venue.address.city,
        state: venue.address.state,
        country: venue.address.country,
      },
    });
    await venue.validate();
    await event.validate();
    assert.equal(event.maxAttendees <= venue.capacity, true);
    assert.equal(event.status, 'draft');
    assert.equal(String(event.venueId), String(venue._id));
    await access(
      resolve(
        dirname(fileURLToPath(import.meta.url)),
        '../../frontend/public/images',
        item.image,
      ),
    );
  }
  assert.equal(
    String(seedId('event', 'afterglow-live')),
    String(plan[0].eventData._id),
  );
});

test('seed requires explicit owner and approximate-location approval before writes', async () => {
  assert.throws(
    () => parseOptions(['--apply']),
    /organizer-email and --demo-locations/,
  );
  assert.throws(() => parseOptions(['--unexpected']), /Unknown seed option/);
  const options = parseOptions([]);
  assert.equal(options.apply, false);
  assert.deepEqual(await runSeed(options), {
    plannedVenues: 8,
    plannedEvents: 8,
  });
});
