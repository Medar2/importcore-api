import { canTransitionQuote } from './quote-status-transitions';

describe('quote-status-transitions', () => {
  it('permite el ciclo comercial previsto', () => {
    expect(canTransitionQuote('DRAFT', 'SENT')).toBe(true);
    expect(canTransitionQuote('SENT', 'ACCEPTED')).toBe(true);
    expect(canTransitionQuote('SENT', 'REJECTED')).toBe(true);
  });

  it('bloquea saltos y CONVERTED manual', () => {
    expect(canTransitionQuote('DRAFT', 'ACCEPTED')).toBe(false);
    expect(canTransitionQuote('SENT', 'DRAFT')).toBe(false);
    expect(canTransitionQuote('ACCEPTED', 'CONVERTED')).toBe(false);
    expect(canTransitionQuote('REJECTED', 'SENT')).toBe(false);
    expect(canTransitionQuote('CONVERTED', 'SENT')).toBe(false);
  });
});
