import { clearInterval, setInterval } from 'node:timers';
import { createReservationService } from './service.js';

export function startReservationExpiryWorker({
  reservationService = createReservationService(),
  intervalMs = 15000,
  logger = console,
} = {}) {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await reservationService.expireBatch();
    } catch {
      logger.error(
        'EventNest reservation expiry failed; retrying next interval.',
      );
    } finally {
      running = false;
    }
  }, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
