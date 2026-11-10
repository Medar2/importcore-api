import type { ContainerStatus } from '../../shipping/entities/shipment-container.entity';

export type ReminderTrigger = 'ETA_3_DAYS' | 'PORT_ARRIVED';

export const ETA_REMINDER_DAYS = 3;

const DAY_MS = 86_400_000;

/**
 * Disparador de recordatorio de saldo según el contenedor (M7): llegada a
 * puerto RD, o tránsito con ETA a <= 3 días. null si no corresponde.
 */
export function reminderTriggerFor(
  container: { status: ContainerStatus; eta: string | null },
  asOf: Date,
): ReminderTrigger | null {
  if (container.status === 'ARRIVED') return 'PORT_ARRIVED';
  if (container.status !== 'IN_TRANSIT' || !container.eta) return null;

  const days = daysUntil(container.eta, asOf);
  return days <= ETA_REMINDER_DAYS ? 'ETA_3_DAYS' : null;
}

/** Días calendario entre `asOf` y una fecha ISO `YYYY-MM-DD` (UTC). */
export function daysUntil(isoDate: string, asOf: Date): number {
  const target = Date.parse(`${isoDate.slice(0, 10)}T00:00:00Z`);
  const today = Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate());
  return Math.round((target - today) / DAY_MS);
}
