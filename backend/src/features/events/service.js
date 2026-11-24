import mongoose from 'mongoose';
import { ApiError } from '../../apiError.js';
import { Event } from '../../models/Event.js';
import { Payment } from '../../models/Payment.js';
import { Ticket } from '../../models/Ticket.js';
import { TicketReservation } from '../../models/TicketReservation.js';
import { Venue } from '../../models/Venue.js';
import { isWholePaisePrice } from './validation.js';

const publicFields =
  'name description category venueId startDate endDate ticketPrice location imageUrl';

function assertEventId(id) {
  if (!mongoose.isObjectIdOrHexString(id))
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid event ID');
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function publicFilter(query, now) {
  const filter = { status: 'published' };
  const startDate = { $gte: query.from ?? now };
  if (query.to) startDate.$lte = query.to;
  filter.startDate = startDate;
  if (query.city)
    filter['location.city'] = new RegExp(`^${escapeRegex(query.city)}$`, 'i');
  if (query.category)
    filter.category = new RegExp(`^${escapeRegex(query.category)}$`, 'i');
  if (query.q) {
    const search = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: search }, { description: search }];
  }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.ticketPrice = {};
    if (query.minPrice !== undefined) filter.ticketPrice.$gte = query.minPrice;
    if (query.maxPrice !== undefined) filter.ticketPrice.$lte = query.maxPrice;
  }
  return filter;
}

async function lockOwnedVenue(
  venueModel,
  venueId,
  organizerId,
  capacity,
  session,
) {
  const venue = await venueModel.findOneAndUpdate(
    { _id: venueId, organizerId, capacity: { $gte: capacity } },
    { $inc: { __v: 1 } },
    { new: true, session },
  );
  if (venue) return venue;
  const existing = await venueModel.findById(venueId, null, { session });
  if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Venue not found');
  if (String(existing.organizerId) !== String(organizerId))
    throw new ApiError(403, 'FORBIDDEN', 'Access denied');
  throw new ApiError(
    409,
    'CAPACITY_CONFLICT',
    'Event capacity exceeds venue capacity',
  );
}

function copiedLocation(venue) {
  return {
    city: venue.address.city,
    state: venue.address.state,
    country: venue.address.country,
  };
}

async function ownedEvent(eventModel, id, organizerId, session) {
  assertEventId(id);
  const event = await eventModel.findById(
    id,
    null,
    session ? { session } : undefined,
  );
  if (!event) throw new ApiError(404, 'NOT_FOUND', 'Event not found');
  if (String(event.organizerId) !== String(organizerId))
    throw new ApiError(403, 'FORBIDDEN', 'Access denied');
  return event;
}

export function createEventService({
  eventModel = Event,
  venueModel = Venue,
  reservationModel = TicketReservation,
  ticketModel = Ticket,
  paymentModel = Payment,
  connection = mongoose.connection,
  now = () => new Date(),
} = {}) {
  return {
    async listPublic(query) {
      const filter = publicFilter(query, now());
      const [items, total] = await Promise.all([
        eventModel
          .find(filter, publicFields)
          .sort({ startDate: 1, _id: 1 })
          .skip((query.page - 1) * query.limit)
          .limit(query.limit)
          .lean(),
        eventModel.countDocuments(filter),
      ]);
      return { items, total, page: query.page, limit: query.limit };
    },
    async getPublic(id) {
      assertEventId(id);
      const event = await eventModel
        .findOne({ _id: id, status: 'published' }, publicFields)
        .lean();
      if (!event) throw new ApiError(404, 'NOT_FOUND', 'Event not found');
      return event;
    },
    async create(organizerId, input) {
      return connection.transaction(async (session) => {
        const venue = await lockOwnedVenue(
          venueModel,
          input.venueId,
          organizerId,
          input.maxAttendees,
          session,
        );
        const event = new eventModel({
          ...input,
          organizerId,
          location: copiedLocation(venue),
          status: 'draft',
        });
        await event.save({ session });
        return event;
      });
    },
    async listOrganizer(organizerId, query) {
      const filter = { organizerId };
      if (query.status) filter.status = query.status;
      const [items, total] = await Promise.all([
        eventModel
          .find(filter)
          .sort({ createdAt: -1, _id: -1 })
          .skip((query.page - 1) * query.limit)
          .limit(query.limit)
          .lean(),
        eventModel.countDocuments(filter),
      ]);
      return { items, total, page: query.page, limit: query.limit };
    },
    async getOrganizer(organizerId, id) {
      return ownedEvent(eventModel, id, organizerId);
    },
    async update(organizerId, id, input) {
      return connection.transaction(async (session) => {
        const event = await ownedEvent(eventModel, id, organizerId, session);
        if (event.status !== 'draft')
          throw new ApiError(
            409,
            'EVENT_NOT_DRAFT',
            'Only draft events can be edited',
          );
        const maxAttendees = input.maxAttendees ?? event.maxAttendees;
        if (maxAttendees < event.ticketsSold + event.ticketsReserved)
          throw new ApiError(
            409,
            'CAPACITY_CONFLICT',
            'Event capacity is below committed inventory',
          );
        const venue = await lockOwnedVenue(
          venueModel,
          input.venueId ?? event.venueId,
          organizerId,
          maxAttendees,
          session,
        );
        const startDate = input.startDate ?? event.startDate;
        const endDate = input.endDate ?? event.endDate;
        if (endDate <= startDate)
          throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'End date must be after start date',
          );
        event.set({ ...input, location: copiedLocation(venue) });
        await event.save({ session });
        return event;
      });
    },
    async publish(organizerId, id) {
      return connection.transaction(async (session) => {
        const event = await ownedEvent(eventModel, id, organizerId, session);
        if (event.status !== 'draft')
          throw new ApiError(
            409,
            'INVALID_EVENT_STATE',
            'Only draft events can be published',
          );
        if (event.startDate <= now())
          throw new ApiError(
            409,
            'PUBLISHING_REQUIREMENTS',
            'Event must start in the future',
          );
        if (
          !event.category?.trim() ||
          !isWholePaisePrice(event.ticketPrice) ||
          event.ticketPrice <= 0
        )
          throw new ApiError(
            409,
            'PUBLISHING_REQUIREMENTS',
            'Event needs a category and positive whole-paise ticket price',
          );
        if (event.maxAttendees < event.ticketsSold + event.ticketsReserved)
          throw new ApiError(
            409,
            'CAPACITY_CONFLICT',
            'Event capacity is below committed inventory',
          );
        await lockOwnedVenue(
          venueModel,
          event.venueId,
          organizerId,
          event.maxAttendees,
          session,
        );
        event.status = 'published';
        await event.save({ session });
        return event;
      });
    },
    async cancel(organizerId, id) {
      return connection.transaction(async (session) => {
        const event = await ownedEvent(eventModel, id, organizerId, session);
        if (!['draft', 'published'].includes(event.status))
          throw new ApiError(
            409,
            'INVALID_EVENT_STATE',
            'Event cannot be cancelled',
          );
        if (event.ticketsSold > 0 || event.ticketsReserved > 0)
          throw new ApiError(
            409,
            'EVENT_HAS_ACTIVITY',
            'Event has ticket activity',
          );
        const openReservation = await reservationModel
          .exists({
            eventId: event._id,
            status: { $in: ['pending', 'confirmed'] },
          })
          .session(session);
        if (openReservation)
          throw new ApiError(
            409,
            'EVENT_HAS_ACTIVITY',
            'Event has ticket activity',
          );
        const ticket = await ticketModel
          .exists({ eventId: event._id })
          .session(session);
        if (ticket)
          throw new ApiError(
            409,
            'EVENT_HAS_ACTIVITY',
            'Event has ticket activity',
          );
        const payment = await paymentModel
          .exists({ eventId: event._id })
          .session(session);
        if (payment)
          throw new ApiError(
            409,
            'EVENT_HAS_ACTIVITY',
            'Event has ticket activity',
          );
        event.status = 'cancelled';
        await event.save({ session });
        return event;
      });
    },
  };
}
