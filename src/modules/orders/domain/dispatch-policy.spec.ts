import { evaluateDispatch } from './dispatch-policy';
import type { DispatchContext } from './dispatch-policy';

const base: DispatchContext = {
  status: 'READY',
  dispatchLocked: false,
  balanceUsd: '0',
  canOverride: false,
};

describe('evaluateDispatch (BR-003)', () => {
  it('permite sin saldo', () => {
    expect(evaluateDispatch(base)).toEqual({ kind: 'ALLOW' });
  });

  it('niega con saldo y sin permiso', () => {
    expect(evaluateDispatch({ ...base, dispatchLocked: true, balanceUsd: '50' })).toEqual({
      kind: 'DENY_BALANCE', balanceUsd: '50',
    });
  });

  it('niega con permiso pero sin motivo (o motivo en blanco)', () => {
    const ctx = { ...base, dispatchLocked: true, balanceUsd: '50', canOverride: true };
    expect(evaluateDispatch(ctx).kind).toBe('DENY_BALANCE');
    expect(evaluateDispatch({ ...ctx, overrideReason: '   ' }).kind).toBe('DENY_BALANCE');
  });

  it('override con permiso y motivo', () => {
    expect(
      evaluateDispatch({
        ...base, dispatchLocked: true, balanceUsd: '50', canOverride: true, overrideReason: 'Cliente VIP',
      }),
    ).toEqual({ kind: 'OVERRIDE' });
  });

  it('rechaza pedidos despachados o cancelados aunque no tengan saldo', () => {
    expect(evaluateDispatch({ ...base, status: 'DISPATCHED' }).kind).toBe('INVALID_STATUS');
    expect(evaluateDispatch({ ...base, status: 'CANCELLED' }).kind).toBe('INVALID_STATUS');
  });

  it('exige estado READY aunque no haya saldo', () => {
    for (const status of ['PENDING', 'CONFIRMED', 'IN_TRANSIT', 'ARRIVED'] as const) {
      expect(evaluateDispatch({ ...base, status }).kind).toBe('INVALID_STATUS');
    }
  });

  it('el override no salta la validación de estado', () => {
    expect(
      evaluateDispatch({
        ...base, status: 'ARRIVED', dispatchLocked: true, balanceUsd: '50',
        canOverride: true, overrideReason: 'Cliente VIP',
      }).kind,
    ).toBe('INVALID_STATUS');
  });
});
