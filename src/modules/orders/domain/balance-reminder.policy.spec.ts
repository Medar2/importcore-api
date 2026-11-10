import { daysUntil, reminderTriggerFor } from './balance-reminder.policy';

const asOf = new Date('2026-11-08T15:00:00Z');

describe('balance-reminder.policy (M7)', () => {
  it('contenedor en puerto dispara PORT_ARRIVED', () => {
    expect(reminderTriggerFor({ status: 'ARRIVED', eta: null }, asOf)).toBe('PORT_ARRIVED');
  });

  it('en tránsito con ETA a 3 días o menos dispara ETA_3_DAYS', () => {
    expect(reminderTriggerFor({ status: 'IN_TRANSIT', eta: '2026-11-11' }, asOf)).toBe('ETA_3_DAYS');
    expect(reminderTriggerFor({ status: 'IN_TRANSIT', eta: '2026-11-08' }, asOf)).toBe('ETA_3_DAYS');
    expect(reminderTriggerFor({ status: 'IN_TRANSIT', eta: '2026-11-05' }, asOf)).toBe('ETA_3_DAYS');
  });

  it('en tránsito con ETA lejana o sin ETA no dispara', () => {
    expect(reminderTriggerFor({ status: 'IN_TRANSIT', eta: '2026-11-12' }, asOf)).toBeNull();
    expect(reminderTriggerFor({ status: 'IN_TRANSIT', eta: null }, asOf)).toBeNull();
  });

  it('otros estados no disparan', () => {
    for (const status of ['PLANNED', 'LOADED', 'DELIVERED', 'RETURNED'] as const) {
      expect(reminderTriggerFor({ status, eta: '2026-11-09' }, asOf)).toBeNull();
    }
  });

  it('daysUntil cuenta días calendario ignorando la hora', () => {
    expect(daysUntil('2026-11-09', asOf)).toBe(1);
    expect(daysUntil('2026-11-07T23:00:00Z', asOf)).toBe(-1);
  });
});
