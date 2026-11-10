import {
  allowedTransitions,
  canTransition,
  orderStatusForContainer,
} from './order-status-transitions';

describe('order-status-transitions', () => {
  it('sigue el flujo PENDING → CONFIRMED → IN_TRANSIT → ARRIVED → READY', () => {
    expect(canTransition('PENDING', 'CONFIRMED')).toBe(true);
    expect(canTransition('CONFIRMED', 'IN_TRANSIT')).toBe(true);
    expect(canTransition('IN_TRANSIT', 'ARRIVED')).toBe(true);
    expect(canTransition('ARRIVED', 'READY')).toBe(true);
  });

  it('no permite saltar ni retroceder etapas', () => {
    expect(canTransition('PENDING', 'ARRIVED')).toBe(false);
    expect(canTransition('ARRIVED', 'IN_TRANSIT')).toBe(false);
    expect(canTransition('READY', 'PENDING')).toBe(false);
  });

  it('solo permite cancelar antes del embarque', () => {
    expect(canTransition('PENDING', 'CANCELLED')).toBe(true);
    expect(canTransition('CONFIRMED', 'CANCELLED')).toBe(true);
    expect(canTransition('IN_TRANSIT', 'CANCELLED')).toBe(false);
  });

  it('nunca permite DISPATCHED manual (BR-003 va por /dispatch)', () => {
    expect(canTransition('READY', 'DISPATCHED')).toBe(false);
    expect(canTransition('ARRIVED', 'DISPATCHED')).toBe(false);
  });

  it('estados terminales no tienen salida', () => {
    expect(allowedTransitions('DISPATCHED')).toEqual([]);
    expect(allowedTransitions('CANCELLED')).toEqual([]);
  });

  describe('orderStatusForContainer', () => {
    it('propaga salida y llegada del contenedor', () => {
      expect(orderStatusForContainer('IN_TRANSIT', 'CONFIRMED')).toBe('IN_TRANSIT');
      expect(orderStatusForContainer('ARRIVED', 'IN_TRANSIT')).toBe('ARRIVED');
    });

    it('ignora pedidos no confirmados, cancelados o ya avanzados', () => {
      expect(orderStatusForContainer('IN_TRANSIT', 'PENDING')).toBeNull();
      expect(orderStatusForContainer('IN_TRANSIT', 'CANCELLED')).toBeNull();
      expect(orderStatusForContainer('ARRIVED', 'READY')).toBeNull();
    });

    it('ignora estados de contenedor sin efecto en el pedido', () => {
      expect(orderStatusForContainer('LOADED', 'CONFIRMED')).toBeNull();
      expect(orderStatusForContainer('DELIVERED', 'ARRIVED')).toBeNull();
    });
  });
});
