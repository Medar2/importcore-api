import { Decimal } from 'decimal.js'
import {
  assessCustomsDuty,
  computeCif,
  computeGravamen,
  computeItbis,
} from './customs-duty-calculator'

describe('customs-duty-calculator (BR-001)', () => {
  it('computeCif = FOB + freight + insurance', () => {
    expect(computeCif(10000, 1500, 100).toString()).toBe('11600')
  })

  it('computeGravamen = CIF * tasa', () => {
    expect(computeGravamen(11600, 0.2).toString()).toBe('2320')
  })

  it('assessCustomsDuty liquida una partida completa sin selectivo', () => {
    const result = assessCustomsDuty({
      fob: 10000,
      freight: 1500,
      insurance: 100,
      rates: { gravamenRate: 0.2 },
      localExpenses: 300,
      bankFees: 50,
    })

    // CIF = 11600, Gravamen = 2320, ITBIS base = 13920, ITBIS = 2505.6
    expect(result.cif.toString()).toBe('11600')
    expect(result.gravamen.toString()).toBe('2320')
    expect(result.selectivo.toString()).toBe('0')
    expect(result.itbisBase.toString()).toBe('13920')
    expect(result.itbis.toString()).toBe('2505.6')
    // landed = CIF + gravamen + gastos locales + comisiones = 11600+2320+300+50
    expect(result.landedCostPreTax.toString()).toBe('14270')
  })

  it('aplica selectivo sobre (CIF + gravamen)', () => {
    const result = assessCustomsDuty({
      fob: 10000,
      freight: 0,
      insurance: 0,
      rates: { gravamenRate: 0.2, selectivoRate: 0.1 },
    })
    // CIF=10000, gravamen=2000, selectivo=(12000)*0.1=1200, base=13200, itbis=2376
    expect(result.selectivo.toString()).toBe('1200')
    expect(result.itbisBase.toString()).toBe('13200')
    expect(result.itbis.toString()).toBe('2376')
  })

  it('no usa floats: resultado es Decimal', () => {
    const result = assessCustomsDuty({
      fob: '0.1',
      freight: '0.2',
      insurance: 0,
      rates: { gravamenRate: '0.18' },
    })
    expect(result.cif).toBeInstanceOf(Decimal)
    expect(result.cif.toString()).toBe('0.3')
  })
})
