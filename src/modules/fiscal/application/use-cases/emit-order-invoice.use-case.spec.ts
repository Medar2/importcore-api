import { BadRequestException, ConflictException } from '@nestjs/common';
import { EmitOrderInvoiceUseCase } from './emit-order-invoice.use-case';
import { MockECfProvider } from '../../infrastructure/providers/mock-ecf.provider';
import { NoSequenceAvailableError } from '../../infrastructure/repositories/ncf-sequence.repository';

const user = { id: 'u1', username: 'admin', person: null, organizationId: null } as never;

function setup(over: { customer?: object; existing?: object | null; seq?: string | Error } = {}) {
  const order = {
    id: 'o1', orderNumber: 'OD-1', status: 'READY', totalUsd: '1000',
    customer: { id: 'c1', name: 'ACME SRL', taxId: '130123454', customerType: 'NACIONAL', ...over.customer },
  };
  const saved: object[] = [];
  const manager = {
    create: (_: unknown, data: object) => data,
    save: (data: object) => { saved.push(data); return Promise.resolve({ id: 'd1', ...data }); },
  };
  const seqRepo = {
    allocate: jest.fn(() =>
      over.seq instanceof Error ? Promise.reject(over.seq) : Promise.resolve(over.seq ?? '7')),
  };
  const audit = { logAccess: jest.fn(() => Promise.resolve()) };
  const provider = new MockECfProvider();
  jest.spyOn(provider, 'emit');

  const uc = new EmitOrderInvoiceUseCase(
    { findOne: () => Promise.resolve(over.existing ?? null) } as never,
    provider,
    { transaction: (fn: (m: unknown) => unknown) => fn(manager) } as never,
    { findById: () => Promise.resolve(order) } as never,
    { findLatest: () => Promise.resolve({ rate: '60' }) } as never,
    { get: () => Promise.resolve({ rnc: '101000012', name: 'Todo Import RD' }) } as never,
    { breakdown: () => Promise.resolve({ cash: '0.00', transfer: '0.00', card: '0.00', credit: '60000.00' }) } as never,
    seqRepo as never,
    audit as never,
  );
  return { uc, saved, provider, audit, seqRepo };
}

describe('EmitOrderInvoiceUseCase', () => {
  it('emite 31 para cliente con RNC, desglosa ITBIS y audita', async () => {
    const { uc, saved, provider, audit } = setup();
    const doc = await uc.execute({ orderId: 'o1' }, user);

    expect(doc).toMatchObject({
      encf: 'E310000000007', ecfType: '31', status: 'ACCEPTED', provider: 'mock',
      subtotalDop: '50847.46', itbisDop: '9152.54', totalDop: '60000.00', exchangeRate: '60',
    });
    expect(saved).toHaveLength(1);
    expect(provider.emit).toHaveBeenCalledWith(expect.objectContaining({ encf: 'E310000000007' }));
    expect(audit.logAccess).toHaveBeenCalledWith(expect.objectContaining({ action: 'EMIT_ECF' }));
  });

  it('cliente con cédula recibe consumo (32)', async () => {
    const { uc } = setup({ customer: { taxId: '00112345678' } });
    expect((await uc.execute({ orderId: 'o1' }, user)).ecfType).toBe('32');
  });

  it('31 exige RNC válido', async () => {
    const { uc } = setup({ customer: { taxId: '123' } });
    await expect(uc.execute({ orderId: 'o1', ecfType: '31' }, user)).rejects.toThrow(BadRequestException);
  });

  it('no emite dos veces para el mismo pedido', async () => {
    const { uc } = setup({ existing: { encf: 'E310000000001' } });
    await expect(uc.execute({ orderId: 'o1' }, user)).rejects.toThrow(ConflictException);
  });

  it('sin secuencia disponible responde 400 y no llama al proveedor', async () => {
    const { uc, provider } = setup({ seq: new NoSequenceAvailableError('31') });
    await expect(uc.execute({ orderId: 'o1' }, user)).rejects.toThrow(BadRequestException);
    expect(provider.emit).not.toHaveBeenCalled();
  });
});
