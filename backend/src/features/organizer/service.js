import mongoose from 'mongoose';
import { ApiError } from '../../apiError.js';
import { Event } from '../../models/Event.js';
import { Venue } from '../../models/Venue.js';
import { Ticket } from '../../models/Ticket.js';
import { TicketReservation } from '../../models/TicketReservation.js';
import { Payment } from '../../models/Payment.js';

function assertEventId(id) {
  if (!mongoose.isObjectIdOrHexString(id))
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid event ID');
}

export function createOrganizerService({
  eventModel = Event,
  venueModel = Venue,
  ticketModel = Ticket,
  reservationModel = TicketReservation,
  paymentModel = Payment,
  now = () => new Date(),
} = {}) {
  async function ownedEvent(eventId, organizerId) {
    assertEventId(eventId);
    const event = await eventModel.findOne({ _id: eventId, organizerId });
    if (!event) throw new ApiError(404, 'NOT_FOUND', 'Event not found');
    return event;
  }

  return {
    async dashboard(organizerId) {
      const eventIds = await eventModel.find({ organizerId }).distinct('_id');
      const [venueCount, eventCount, publishedCount, soldTickets, paymentRows] =
        await Promise.all([
          venueModel.countDocuments({ organizerId }),
          eventModel.countDocuments({ organizerId }),
          eventModel.countDocuments({ organizerId, status: 'published' }),
          ticketModel.countDocuments({
            eventId: { $in: eventIds },
            status: { $in: ['valid', 'used'] },
          }),
          eventIds.length
            ? paymentModel.aggregate([
                {
                  $match: { eventId: { $in: eventIds }, status: 'successful' },
                },
                {
                  $group: {
                    _id: null,
                    paidAmount: { $sum: '$amount' },
                    successfulPayments: { $sum: 1 },
                  },
                },
              ])
            : [],
        ]);
      return {
        venueCount,
        eventCount,
        publishedCount,
        soldTickets,
        successfulPayments: paymentRows[0]?.successfulPayments ?? 0,
        paidAmount: paymentRows[0]?.paidAmount ?? 0,
      };
    },
    async eventAnalytics(organizerId, eventId) {
      const event = await ownedEvent(eventId, organizerId);
      const [ticketRows, activeHolds, paymentRows] = await Promise.all([
        ticketModel.aggregate([
          { $match: { eventId: event._id } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        reservationModel.countDocuments({
          eventId: event._id,
          status: 'pending',
          expiresAt: { $gt: now() },
        }),
        paymentModel.aggregate([
          { $match: { eventId: event._id, status: 'successful' } },
          {
            $group: {
              _id: null,
              paidAmount: { $sum: '$amount' },
              successfulPayments: { $sum: 1 },
            },
          },
        ]),
      ]);
      const ticketCounts = { valid: 0, used: 0, cancelled: 0, refunded: 0 };
      for (const row of ticketRows) ticketCounts[row._id] = row.count;
      return {
        eventId: event._id,
        maxAttendees: event.maxAttendees,
        ticketsSold: event.ticketsSold,
        ticketsReserved: event.ticketsReserved,
        available: Math.max(
          0,
          event.maxAttendees - event.ticketsSold - event.ticketsReserved,
        ),
        activeHolds,
        ticketCounts,
        successfulPayments: paymentRows[0]?.successfulPayments ?? 0,
        paidAmount: paymentRows[0]?.paidAmount ?? 0,
      };
    },
    async attendees(organizerId, eventId, { page, limit }) {
      const event = await ownedEvent(eventId, organizerId);
      const filter = { eventId: event._id };
      const [items, total] = await Promise.all([
        ticketModel
          .find(filter)
          .select('ticketNumber userId status issuedAt usedAt checkedInBy')
          .sort({ createdAt: -1, _id: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate({ path: 'userId', select: 'name email' }),
        ticketModel.countDocuments(filter),
      ]);
      return { items, page, limit, total };
    },
  };
}
