import mongoose from 'mongoose';
import { ApiError } from '../../apiError.js';
import { Ticket } from '../../models/Ticket.js';
import { TicketReservation } from '../../models/TicketReservation.js';
import { Payment } from '../../models/Payment.js';

const eventSummary = 'name startDate endDate status location imageUrl';

function assertTicketId(id) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid ticket ID');
  }
}

export function createTicketService({
  ticketModel = Ticket,
  reservationModel = TicketReservation,
  paymentModel = Payment,
} = {}) {
  return {
    async list(userId, { page, limit }) {
      const filter = { userId };
      const [items, total] = await Promise.all([
        ticketModel
          .find(filter)
          .select('-__v')
          .sort({ createdAt: -1, _id: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate({ path: 'eventId', select: eventSummary }),
        ticketModel.countDocuments(filter),
      ]);
      return { items, page, limit, total };
    },
    async get(userId, ticketId) {
      assertTicketId(ticketId);
      const ticket = await ticketModel
        .findOne({ _id: ticketId, userId })
        .select('-__v')
        .populate({ path: 'eventId', select: eventSummary });
      if (!ticket) throw new ApiError(404, 'NOT_FOUND', 'Ticket not found');
      return ticket;
    },
    async history(userId, { page, limit }) {
      const filter = { userId };
      const [reservations, total] = await Promise.all([
        reservationModel
          .find(filter)
          .select('-__v')
          .sort({ createdAt: -1, _id: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate({ path: 'eventId', select: eventSummary }),
        reservationModel.countDocuments(filter),
      ]);
      const reservationIds = reservations.map((reservation) => reservation._id);
      if (reservationIds.length === 0) return { items: [], page, limit, total };
      const [payments, tickets] = await Promise.all([
        paymentModel
          .find({ userId, reservationId: { $in: reservationIds } })
          .select(
            'reservationId status refundStatus amount currency paidAt refundedAt createdAt',
          )
          .sort({ createdAt: -1 }),
        ticketModel
          .find({ userId, reservationId: { $in: reservationIds } })
          .select('reservationId status'),
      ]);
      const items = reservations.map((reservation) => ({
        reservation,
        payments: payments.filter(
          (payment) =>
            String(payment.reservationId) === String(reservation._id),
        ),
        ticketCounts: tickets
          .filter(
            (ticket) =>
              String(ticket.reservationId) === String(reservation._id),
          )
          .reduce(
            (counts, ticket) => {
              counts[ticket.status] = (counts[ticket.status] ?? 0) + 1;
              return counts;
            },
            { valid: 0, used: 0, cancelled: 0, refunded: 0 },
          ),
      }));
      return { items, page, limit, total };
    },
  };
}
