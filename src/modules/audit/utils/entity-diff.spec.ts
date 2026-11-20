import { diffEntities } from './entity-diff';

describe('diffEntities', () => {
  it('returns only changed fields', () => {
    const diff = diffEntities(
      { status: 'PENDING', total: '100', notes: 'a' },
      { status: 'DISPATCHED', total: '100', notes: 'a' },
    );
    expect(diff).toEqual({ status: { from: 'PENDING', to: 'DISPATCHED' } });
  });

  it('ignores audit timestamp fields', () => {
    const diff = diffEntities(
      { status: 'A', updatedAt: new Date('2024-01-01') },
      { status: 'A', updatedAt: new Date('2024-01-02') },
    );
    expect(diff).toBeNull();
  });

  it('returns null when nothing changed', () => {
    expect(diffEntities({ a: 1 }, { a: 1 })).toBeNull();
  });

  it('returns null when before or after is missing', () => {
    expect(diffEntities(null, { a: 1 })).toBeNull();
    expect(diffEntities({ a: 1 }, undefined)).toBeNull();
  });

  it('detects nested jsonb changes', () => {
    const diff = diffEntities(
      { meta: { x: 1 } },
      { meta: { x: 2 } },
    );
    expect(diff).toEqual({ meta: { from: { x: 1 }, to: { x: 2 } } });
  });
});
