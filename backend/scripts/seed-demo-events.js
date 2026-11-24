import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createClerkClient } from '@clerk/express';
import mongoose from 'mongoose';
import { loadClerkConfig } from '../src/config/clerk.js';
import {
  configureCloudinary,
  loadCloudinaryConfig,
} from '../src/config/cloudinary.js';
import { loadRazorpayConfig } from '../src/config/razorpay.js';
import { createEventService } from '../src/features/events/service.js';
import { createMediaService } from '../src/features/media/service.js';
import { createVenueService } from '../src/features/venues/service.js';
import { Event } from '../src/models/Event.js';
import { User } from '../src/models/User.js';
import { Venue } from '../src/models/Venue.js';
import { isEmail } from '../src/models/validators.js';

// Snapshot of the eight presentation cards originally in frontend/src/features/events/catalog.ts.
const catalog = [
  {
    slug: 'afterglow-live',
    name: 'Afterglow Live',
    category: 'Music',
    venue: 'Harbour Arena',
    city: 'Mumbai',
    start: '2027-02-20T19:00:00+05:30',
    price: 2499,
    image: 'concert.jpg',
    presenter: 'Good Nights Collective',
    description:
      'A full evening of live music, luminous sets, and the kind of crowd that sings every chorus together.',
  },
  {
    slug: 'makers-summit',
    name: 'Makers Summit 2027',
    category: 'Technology',
    venue: 'The Forum',
    city: 'Bengaluru',
    start: '2027-03-06T09:30:00+05:30',
    price: 1899,
    image: 'conference.jpg',
    presenter: 'Makers Guild',
    description:
      'Ideas, conversations, and practical lessons from people building the next wave of useful technology.',
  },
  {
    slug: 'street-food-social',
    name: 'Street Food Social',
    category: 'Food',
    venue: 'Old Mill Grounds',
    city: 'Delhi',
    start: '2027-03-13T12:00:00+05:30',
    price: 499,
    image: 'food.jpg',
    presenter: 'The Table Project',
    description:
      'A day spent tasting familiar favorites and new discoveries from independent cooks and neighborhood kitchens.',
  },
  {
    slug: 'art-in-motion',
    name: 'Art in Motion',
    category: 'Arts',
    venue: 'South Gallery',
    city: 'Mumbai',
    start: '2027-03-21T11:00:00+05:30',
    price: 699,
    image: 'art.jpg',
    presenter: 'Open Canvas',
    description:
      'Explore contemporary work from emerging artists, then meet the people and stories behind the pieces.',
  },
  {
    slug: 'city-derby',
    name: 'The City Derby',
    category: 'Sports',
    venue: 'Central Stadium',
    city: 'Bengaluru',
    start: '2027-04-03T18:30:00+05:30',
    price: 999,
    image: 'sports.jpg',
    presenter: 'City Sport Live',
    description:
      'Big-match atmosphere, a packed stand, and ninety minutes to remember with fellow supporters.',
  },
  {
    slug: 'weekend-workshop',
    name: 'Weekend Workshop',
    category: 'Workshops',
    venue: 'The Commons',
    city: 'Pune',
    start: '2027-04-10T10:00:00+05:30',
    price: 1299,
    image: 'workshop.jpg',
    presenter: 'Makers Guild',
    description:
      'Learn something new in good company through a practical workshop made for curious beginners.',
  },
  {
    slug: 'night-shift-sessions',
    name: 'Night Shift Sessions',
    category: 'Music',
    venue: 'Warehouse 8',
    city: 'Hyderabad',
    start: '2027-04-24T20:00:00+05:30',
    price: 899,
    image: 'stage.jpg',
    presenter: 'Good Nights Collective',
    description:
      'An intimate night of live bands, new sounds and familiar faces in a space built for music.',
  },
  {
    slug: 'jazz-by-the-bay',
    name: 'Jazz by the Bay',
    category: 'Music',
    venue: 'The Blue Room',
    city: 'Mumbai',
    start: '2027-05-01T19:30:00+05:30',
    price: 1199,
    image: 'jazz.jpg',
    presenter: 'Blue Hour Sessions',
    description:
      'A relaxed evening of live jazz, warm lights and good company by the waterfront.',
  },
];

// The old cards supplied city names but no physical venue details. These are
// explicitly approximate demo locations, never claimed as real street addresses.
const cities = {
  Mumbai: { state: 'Maharashtra', coordinates: [72.8777, 19.076] },
  Bengaluru: { state: 'Karnataka', coordinates: [77.5946, 12.9716] },
  Delhi: { state: 'Delhi', coordinates: [77.209, 28.6139] },
  Pune: { state: 'Maharashtra', coordinates: [73.8567, 18.5204] },
  Hyderabad: { state: 'Telangana', coordinates: [78.4867, 17.385] },
};

const venues = {
  'Harbour Arena': { type: 'auditorium', capacity: 2500 },
  'The Forum': { type: 'auditorium', capacity: 800 },
  'Old Mill Grounds': { type: 'outdoor', capacity: 1200 },
  'South Gallery': { type: 'other', capacity: 180 },
  'Central Stadium': { type: 'outdoor', capacity: 5000 },
  'The Commons': { type: 'other', capacity: 100 },
  'Warehouse 8': { type: 'club', capacity: 400 },
  'The Blue Room': { type: 'club', capacity: 120 },
};

export function seedId(kind, slug) {
  return new mongoose.Types.ObjectId(
    createHash('sha256')
      .update(`eventnest-demo-v1:${kind}:${slug}`)
      .digest()
      .subarray(0, 12),
  );
}

export function buildSeedPlan() {
  return catalog.map((item) => {
    const city = cities[item.city];
    const venue = venues[item.venue];
    if (!city || !venue)
      throw new Error(`Missing demo venue details for ${item.slug}`);
    const startDate = new Date(item.start);
    const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);
    const venueId = seedId('venue', item.venue);
    const eventId = seedId('event', item.slug);
    const venueData = {
      _id: venueId,
      name: item.venue,
      type: venue.type,
      description: `EventNest demo venue in ${item.city}. Coordinates show the approximate city center, not the venue entrance.`,
      address: { city: item.city, state: city.state, country: 'India' },
      location: { type: 'Point', coordinates: city.coordinates },
      capacity: venue.capacity,
    };
    const eventData = {
      _id: eventId,
      venueId,
      name: item.name,
      description: `${item.description} Demo listing for testing; not a real event. Original preview presenter: ${item.presenter}.`,
      category: item.category,
      startDate,
      endDate,
      maxAttendees: venue.capacity,
      ticketPrice: item.price,
    };
    return { ...item, venueData, eventData };
  });
}

export function parseOptions(args) {
  const options = {
    apply: false,
    publish: false,
    demoLocations: false,
    grantOrganizerRole: false,
    organizerEmail: '',
  };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--organizer-email') options.organizerEmail = args[++i] ?? '';
    else if (arg === '--apply') options.apply = true;
    else if (arg === '--publish') options.publish = true;
    else if (arg === '--demo-locations') options.demoLocations = true;
    else if (arg === '--grant-organizer-role')
      options.grantOrganizerRole = true;
    else throw new Error(`Unknown seed option: ${arg}`);
  }
  if (
    options.apply &&
    (!isEmail(options.organizerEmail) || !options.demoLocations)
  )
    throw new Error(
      'Applying the seed requires --organizer-email and --demo-locations',
    );
  return options;
}

async function verifyOrganizer(email, grantOrganizerRole) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (
    !user ||
    user.accountStatus !== 'active' ||
    !user.verification.emailVerified
  )
    throw new Error(
      'Organizer must be an active EventNest user with a verified email',
    );
  const client = createClerkClient({ secretKey: loadClerkConfig().secretKey });
  const clerkUser = await client.users.getUser(user.clerkId);
  const primary = clerkUser.emailAddresses.find(
    (address) => address.id === clerkUser.primaryEmailAddressId,
  );
  if (
    clerkUser.id !== user.clerkId ||
    primary?.emailAddress?.toLowerCase() !== email.toLowerCase() ||
    primary.verification?.status !== 'verified'
  )
    throw new Error(
      'Clerk identity does not match the verified EventNest profile',
    );
  if (!user.roles.includes('organizer')) {
    if (!grantOrganizerRole)
      throw new Error(
        'Account lacks organizer role; pass --grant-organizer-role only with owner approval',
      );
    await User.updateOne(
      { _id: user._id },
      { $addToSet: { roles: 'organizer' } },
    );
  }
  return user;
}

async function existingOrCreate(model, service, ownerId, id, data, label) {
  let existing = await model.findById(id);
  if (existing) {
    if (String(existing.organizerId) !== String(ownerId))
      throw new Error(`Seed ${label} belongs to another organizer`);
    if (label === 'event' && String(existing.venueId) !== String(data.venueId))
      throw new Error('Seed event references a different venue');
    return { document: existing, created: false };
  }
  const conflicting = await model.findOne({
    organizerId: ownerId,
    name: data.name,
  });
  if (conflicting)
    throw new Error(`An existing ${label} already has the seed name`);
  try {
    return { document: await service.create(ownerId, data), created: true };
  } catch (error) {
    if (error?.code !== 11000) throw error;
    existing = await model.findById(id);
    if (!existing || String(existing.organizerId) !== String(ownerId))
      throw error;
    return { document: existing, created: false };
  }
}

export async function runSeed(options) {
  const plan = buildSeedPlan();
  if (!options.apply)
    return { plannedVenues: plan.length, plannedEvents: plan.length };
  if (!process.env.MONGODB_URI?.trim())
    throw new Error('MONGODB_URI is required');
  const mediaConfig = loadCloudinaryConfig();
  if (!mediaConfig)
    throw new Error('Cloudinary is required to restore the eight event images');
  if (options.publish) {
    const razorpay = loadRazorpayConfig();
    if (!razorpay?.keyId.startsWith('rzp_test_'))
      throw new Error(
        'Demo events may be published only with Razorpay test keys',
      );
    if (plan.some(({ eventData }) => eventData.startDate <= new Date()))
      throw new Error('Demo events must be in the future to publish');
  }
  configureCloudinary(mediaConfig);
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  try {
    const organizer = await verifyOrganizer(
      options.organizerEmail,
      options.grantOrganizerRole,
    );
    const venueService = createVenueService();
    const eventService = createEventService();
    const mediaService = createMediaService({ configured: true });
    const result = {
      createdVenues: 0,
      createdEvents: 0,
      uploadedImages: 0,
      publishedEvents: 0,
    };
    for (const item of plan) {
      const saved = await existingOrCreate(
        Venue,
        venueService,
        organizer._id,
        item.venueData._id,
        item.venueData,
        'venue',
      );
      if (saved.created) result.createdVenues += 1;
    }
    for (const item of plan) {
      const saved = await existingOrCreate(
        Event,
        eventService,
        organizer._id,
        item.eventData._id,
        item.eventData,
        'event',
      );
      if (saved.created) result.createdEvents += 1;
    }
    for (const item of plan) {
      const event = await Event.findById(item.eventData._id);
      if (event.imageUrl && event.imagePublicId) continue;
      const imagePath = resolve(
        dirname(fileURLToPath(import.meta.url)),
        '../../frontend/public/images',
        item.image,
      );
      await mediaService.replace(
        'event',
        event._id,
        organizer._id,
        await readFile(imagePath),
        'image/jpeg',
      );
      result.uploadedImages += 1;
    }
    if (options.publish) {
      for (const item of plan) {
        const event = await Event.findById(item.eventData._id);
        if (event.status === 'published') continue;
        await eventService.publish(organizer._id, event._id);
        result.publishedEvents += 1;
      }
    }
    return result;
  } finally {
    await mongoose.disconnect();
  }
}

const calledDirectly =
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (calledDirectly) {
  try {
    const options = parseOptions(process.argv.slice(2));
    console.log(JSON.stringify(await runSeed(options)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Demo seed failed');
    process.exitCode = 1;
  }
}
