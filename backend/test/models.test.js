import assert from 'node:assert/strict';
import { test } from 'node:test';
import mongoose from 'mongoose';
import {
  Event,
  Payment,
  QRCredential,
  Ticket,
  TicketReservation,
  User,
  Venue,
  Wishlist,
} from '../src/models/index.js';

const userId = new mongoose.Types.ObjectId();
const venueId = new mongoose.Types.ObjectId();
const eventId = new mongoose.Types.ObjectId();
const reservationId = new mongoose.Types.ObjectId();
const ticketId = new mongoose.Types.ObjectId();

const validUser = () => ({
  clerkId: 'user_example',
  email: 'PERSON@EXAMPLE.COM',
  phoneNumber: '+14155552671',
});

const validVenue = () => ({
  organizerId: userId,
  name: 'Main Hall',
  type: 'auditorium',
  address: { city: 'Mumbai', country: 'India' },
  location: { type: 'Point', coordinates: [72.8777, 19.076] },
  capacity: 200,
});

const validEvent = () => ({
  organizerId: userId,
  venueId,
  name: 'Live Concert',
  startDate: new Date('2027-01-01T18:00:00Z'),
  endDate: new Date('2027-01-01T21:00:00Z'),
  maxAttendees: 100,
  ticketPrice: 500,
  location: { city: 'Mumbai', country: 'India' },
});

const validReservation = () => ({
  userId,
  eventId,
  quantity: 2,
  expiresAt: new Date('2027-01-01T17:00:00Z'),
});

const validTicket = () => ({
  eventId,
  userId,
  reservationId,
  ticketNumber: 'EVN-1',
  pricePaid: 500,
  status: 'valid',
  issuedAt: new Date('2027-01-01T16:00:00Z'),
});

const validPayment = () => ({
  userId,
  eventId,
  reservationId,
  providerOrderId: 'order_example',
  amount: 1000,
});

function hasIndex(model, keys, expectedOptions = {}) {
  return model.schema
    .indexes()
    .some(
      ([indexKeys, options]) =>
        JSON.stringify(indexKeys) === JSON.stringify(keys) &&
        Object.entries(expectedOptions).every(
          ([key, value]) =>
            JSON.stringify(options[key]) === JSON.stringify(value),
        ),
    );
}

test('all eight models use the specified collection names and ObjectId references', () => {
  const collections = [
    [User, 'users'],
    [Venue, 'venues'],
    [Event, 'events'],
    [TicketReservation, 'ticketReservations'],
    [Ticket, 'tickets'],
    [QRCredential, 'qrCredentials'],
    [Payment, 'payments'],
    [Wishlist, 'wishlists'],
  ];
  for (const [model, collection] of collections) {
    assert.equal(model.collection.name, collection);
    assert.ok(mongoose.modelNames().includes(model.modelName));
  }
  assert.equal(QRCredential.modelName, 'QRCredential');

  for (const [model, path, ref] of [
    [Venue, 'organizerId', 'User'],
    [Event, 'organizerId', 'User'],
    [Event, 'venueId', 'Venue'],
    [TicketReservation, 'userId', 'User'],
    [TicketReservation, 'eventId', 'Event'],
    [Ticket, 'eventId', 'Event'],
    [Ticket, 'reservationId', 'TicketReservation'],
    [Ticket, 'userId', 'User'],
    [Ticket, 'checkedInBy', 'User'],
    [QRCredential, 'ticketId', 'Ticket'],
    [Payment, 'userId', 'User'],
    [Payment, 'eventId', 'Event'],
    [Payment, 'reservationId', 'TicketReservation'],
    [Wishlist, 'userId', 'User'],
    [Wishlist, 'eventId', 'Event'],
  ]) {
    assert.equal(model.schema.path(path).instance, 'ObjectId');
    assert.equal(model.schema.path(path).options.ref, ref);
  }
});

test('user normalizes email, supports both roles, and rejects invalid contact data', async () => {
  const user = new User({ ...validUser(), roles: ['attendee', 'organizer'] });
  await user.validate();
  assert.equal(user.email, 'person@example.com');
  assert.deepEqual(user.roles, ['attendee', 'organizer']);
  assert.equal(user.verification.emailVerified, false);
  assert.equal(user.verification.phoneVerified, false);
  const userWithoutPhone = new User({
    clerkId: 'user_no_phone',
    email: 'no-phone@example.com',
  });
  await userWithoutPhone.validate();
  assert.equal(userWithoutPhone.phoneNumber, undefined);
  await assert.rejects(
    new User({ ...validUser(), phoneNumber: '4155552671' }).validate(),
  );
  await assert.rejects(
    new User({ ...validUser(), phoneNumber: '   ' }).validate(),
  );
  await assert.rejects(
    new User({ ...validUser(), phoneNumber: null }).validate(),
  );
  await assert.rejects(
    new User({ ...validUser(), email: 'invalid' }).validate(),
  );
  await assert.rejects(
    new User({ ...validUser(), roles: ['attendee', 'attendee'] }).validate(),
  );
  await assert.rejects(
    new User({ ...validUser(), roles: ['admin'] }).validate(),
  );
});

test('venue validates type, capacity, and longitude/latitude', async () => {
  await new Venue(validVenue()).validate();
  await assert.rejects(
    new Venue({ ...validVenue(), type: 'hotel' }).validate(),
  );
  await assert.rejects(new Venue({ ...validVenue(), capacity: 0 }).validate());
  await assert.rejects(
    new Venue({ ...validVenue(), capacity: 2.5 }).validate(),
  );
  await assert.rejects(
    new Venue({
      ...validVenue(),
      location: { type: 'Point', coordinates: [19.076, 190] },
    }).validate(),
  );
});

test('event requires a venue, ordered dates, and valid inventory fields', async () => {
  const event = new Event(validEvent());
  await event.validate();
  assert.equal(event.eventType, 'in-person');
  assert.equal(event.status, 'draft');
  assert.equal(event.ticketsSold, 0);
  assert.equal(event.ticketsReserved, 0);
  await assert.rejects(
    new Event({ ...validEvent(), venueId: undefined }).validate(),
  );
  await assert.rejects(
    new Event({ ...validEvent(), eventType: 'online' }).validate(),
  );
  await assert.rejects(
    new Event({ ...validEvent(), endDate: validEvent().startDate }).validate(),
  );
  await assert.rejects(
    new Event({ ...validEvent(), ticketsSold: -1 }).validate(),
  );
  await assert.rejects(
    new Event({
      ...validEvent(),
      ticketsSold: 99,
      ticketsReserved: 2,
    }).validate(),
  );
  await assert.rejects(
    new Event({ ...validEvent(), ticketPrice: -1 }).validate(),
  );
});

test('reservation requires a positive quantity and expiry without automatic TTL', async () => {
  const reservation = new TicketReservation(validReservation());
  await reservation.validate();
  assert.equal(reservation.status, 'pending');
  await assert.rejects(
    new TicketReservation({ ...validReservation(), quantity: 0 }).validate(),
  );
  await assert.rejects(
    new TicketReservation({
      ...validReservation(),
      expiresAt: undefined,
    }).validate(),
  );
  assert.ok(
    !TicketReservation.schema
      .indexes()
      .some(
        ([keys, options]) =>
          (keys.expiresAt || keys.cleanupAt) &&
          options.expireAfterSeconds !== undefined,
      ),
  );
});

test('ticket validates issuance fields and status', async () => {
  await new Ticket(validTicket()).validate();
  await assert.rejects(
    new Ticket({ ...validTicket(), ticketNumber: undefined }).validate(),
  );
  await assert.rejects(
    new Ticket({ ...validTicket(), status: 'pending' }).validate(),
  );
  await assert.rejects(
    new Ticket({ ...validTicket(), pricePaid: -5 }).validate(),
  );
});

test('QR credential requires a token hash and allows only active or revoked states', async () => {
  await new QRCredential({ ticketId, tokenHash: 'hash_value' }).validate();
  await assert.rejects(
    new QRCredential({ ticketId, tokenHash: '' }).validate(),
  );
  await assert.rejects(
    new QRCredential({
      ticketId,
      tokenHash: 'hash_value',
      status: 'used',
    }).validate(),
  );
});

test('payment supports an absent payment ID but requires order ID and positive amount', async () => {
  const payment = new Payment(validPayment());
  await payment.validate();
  assert.equal(payment.provider, 'razorpay');
  assert.equal(payment.currency, 'INR');
  assert.equal(payment.providerPaymentId, undefined);
  await assert.rejects(
    new Payment({ ...validPayment(), providerOrderId: undefined }).validate(),
  );
  await assert.rejects(
    new Payment({ ...validPayment(), providerPaymentId: '   ' }).validate(),
  );
  await assert.rejects(
    new Payment({ ...validPayment(), amount: -1 }).validate(),
  );
  await assert.rejects(
    new Payment({ ...validPayment(), status: 'refunded' }).validate(),
  );
});

test('defaulted required state fields reject explicit null', async () => {
  const invalidDocuments = [
    new User({ ...validUser(), roles: null }),
    new User({ ...validUser(), verification: { emailVerified: null } }),
    new User({ ...validUser(), verification: { phoneVerified: null } }),
    new User({ ...validUser(), accountStatus: null }),
    new Event({ ...validEvent(), eventType: null }),
    new Event({ ...validEvent(), status: null }),
    new Event({ ...validEvent(), ticketsSold: null }),
    new Event({ ...validEvent(), ticketsReserved: null }),
    new TicketReservation({ ...validReservation(), status: null }),
    new QRCredential({ ticketId, tokenHash: 'hash_value', status: null }),
    new Payment({ ...validPayment(), provider: null }),
    new Payment({ ...validPayment(), currency: null }),
    new Payment({ ...validPayment(), status: null }),
  ];

  for (const document of invalidDocuments) {
    await assert.rejects(document.validate(), { name: 'ValidationError' });
  }
});

test('wishlist requires both references and has only createdAt timestamp', async () => {
  await new Wishlist({ userId, eventId }).validate();
  await assert.rejects(new Wishlist({ userId }).validate());
  assert.ok(Wishlist.schema.path('createdAt'));
  assert.equal(Wishlist.schema.path('updatedAt'), undefined);
});

test('index blueprint includes unique and query indexes without speculative TTL', () => {
  for (const key of ['clerkId', 'email']) {
    assert.ok(hasIndex(User, { [key]: 1 }, { unique: true }));
  }
  assert.ok(
    hasIndex(
      User,
      { phoneNumber: 1 },
      {
        name: 'phoneNumber_unique_when_present',
        unique: true,
        partialFilterExpression: { phoneNumber: { $type: 'string' } },
      },
    ),
  );
  assert.ok(hasIndex(Venue, { organizerId: 1 }));
  assert.ok(hasIndex(Venue, { 'address.city': 1 }));
  assert.ok(hasIndex(Venue, { location: '2dsphere' }));
  assert.ok(hasIndex(Event, { organizerId: 1, createdAt: -1 }));
  assert.ok(hasIndex(Event, { venueId: 1 }));
  assert.ok(hasIndex(Event, { status: 1, startDate: 1 }));
  assert.ok(hasIndex(Event, { 'location.city': 1, status: 1, startDate: 1 }));
  assert.ok(hasIndex(TicketReservation, { userId: 1, createdAt: -1 }));
  assert.ok(
    hasIndex(TicketReservation, { eventId: 1, status: 1, expiresAt: 1 }),
  );
  assert.ok(hasIndex(Ticket, { ticketNumber: 1 }, { unique: true }));
  assert.ok(hasIndex(Ticket, { userId: 1, createdAt: -1 }));
  assert.ok(hasIndex(Ticket, { eventId: 1, status: 1 }));
  assert.ok(hasIndex(Ticket, { reservationId: 1 }));
  assert.ok(hasIndex(QRCredential, { ticketId: 1 }, { unique: true }));
  assert.ok(hasIndex(QRCredential, { tokenHash: 1 }, { unique: true }));
  assert.ok(hasIndex(Payment, { userId: 1, createdAt: -1 }));
  assert.ok(hasIndex(Payment, { eventId: 1, status: 1 }));
  assert.ok(hasIndex(Payment, { reservationId: 1 }));
  assert.ok(
    hasIndex(Payment, { provider: 1, providerOrderId: 1 }, { unique: true }),
  );
  assert.ok(
    hasIndex(
      Payment,
      { provider: 1, providerPaymentId: 1 },
      {
        unique: true,
        partialFilterExpression: { providerPaymentId: { $type: 'string' } },
      },
    ),
  );
  assert.ok(hasIndex(Wishlist, { userId: 1, eventId: 1 }, { unique: true }));
});
