import {
  buildDgiiFile,
  format606Line,
  format607Line,
  format608Line,
} from './dgii-report.formatter';
import { parseFiscalPeriod } from './fiscal-period';

describe('DGII 606/607/608', () => {
  it('606: 23 columnas, ITBIS por adelantar calculado y opcionales vacíos', () => {
    const line = format606Line({
      taxId: '1-01-00001-2', taxIdType: '1', goodsServicesType: '02', ncf: 'B0100000123',
      invoiceDate: '2026-11-05', paymentDate: '2026-11-10',
      servicesAmount: '10000', goodsAmount: '0', itbisBilled: '1800', itbisWithheld: '540',
      isrWithholdingType: '02', isrWithheld: '1000', paymentMethod: '02',
    });
    const cols = line.split('|');
    expect(cols).toHaveLength(23);
    expect(line).toBe(
      '101000012|1|02|B0100000123||20261105|20261110|10000.00|0.00|10000.00|1800.00|540.00|||1800.00||02|1000.00|||||02',
    );
  });

  it('607: 23 columnas con formas de cobro', () => {
    const line = format607Line({
      taxId: '130123456', taxIdType: '1', ncf: 'E310000000001', incomeType: '01',
      invoiceDate: '2026-11-08', billedAmount: '50000', itbisBilled: '9000',
      cash: '0', transfer: '30000', card: '0', credit: '29000',
    });
    expect(line.split('|')).toHaveLength(23);
    expect(line).toBe(
      '130123456|1|E310000000001||01|20261108||50000.00|9000.00|||||||||30000.00||29000.00|||',
    );
  });

  it('608: NCF|fecha|tipo', () => {
    expect(format608Line({ ncf: 'E320000000007', invoiceDate: '2026-11-03', cancellationType: '04' }))
      .toBe('E320000000007|20261103|04');
  });

  it('archivo con encabezado formato|RNC|período|cantidad y CRLF', () => {
    const file = buildDgiiFile('608', '1-30-12345-6', '202611', ['A', 'B']);
    expect(file).toBe('608|130123456|202611|2\r\nA\r\nB\r\n');
  });

  it('archivo vacío es válido (solo encabezado con 0)', () => {
    expect(buildDgiiFile('606', '130123456', '202611', [])).toBe('606|130123456|202611|0\r\n');
  });

  it('rechaza RNC de empresa inválido', () => {
    expect(() => buildDgiiFile('606', '123', '202611', [])).toThrow();
  });
});

describe('parseFiscalPeriod', () => {
  it('expande el mes, incluido febrero bisiesto', () => {
    expect(parseFiscalPeriod('202611')).toEqual({ code: '202611', start: '2026-11-01', end: '2026-11-30' });
    expect(parseFiscalPeriod('202802').end).toBe('2028-02-29');
  });

  it.each(['2026', '202613', '202600', 'abcdef'])('rechaza %p', (p) => {
    expect(() => parseFiscalPeriod(p)).toThrow();
  });
});
