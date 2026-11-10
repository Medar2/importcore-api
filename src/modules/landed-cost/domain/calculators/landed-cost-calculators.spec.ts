import { boxCbm, unitCbm, lineCbm, orderCbm } from './cbm-calculator'
import {
  CONTAINER_SPECS,
  recommendContainer,
  fitsSingleFcl,
} from './container-capacity'
import {
  prorate,
  prorateByCbm,
  prorateByWeight,
  prorateByValue,
} from './landed-cost-prorater'

describe('cbm-calculator (BR-002)', () => {
  it('calcula CBM de caja desde dimensiones en metros', () => {
    expect(boxCbm({ lengthM: 0.6, widthM: 0.4, heightM: 0.5 }).toString()).toBe('0.12')
  })

  it('calcula CBM unitario dividiendo por unidades por caja', () => {
    expect(unitCbm(0.12, 6).toString()).toBe('0.02')
  })

  it('calcula CBM total de linea y de pedido', () => {
    const line = lineCbm(0.12, 10)
    expect(line.toString()).toBe('1.2')
    expect(orderCbm([line, 0.8]).toString()).toBe('2')
  })

  it('rechaza unidades por caja invalidas', () => {
    expect(() => unitCbm(1, 0)).toThrow()
  })
})

describe('container-capacity (BR-002)', () => {
  it('expone las capacidades de la especificacion', () => {
    expect(CONTAINER_SPECS['20_ST'].usableCbm).toBe(28)
    expect(CONTAINER_SPECS['40_HC'].usableCbm).toBe(68)
    expect(CONTAINER_SPECS['40_ST'].maxPayloadKg).toBe(26000)
  })

  it('recomienda el FCL mas pequeno que quepa', () => {
    expect(recommendContainer(10, 5000)).toBe('20_ST')
    expect(recommendContainer(30, 10000)).toBe('40_ST')
    expect(recommendContainer(60, 20000)).toBe('40_HC')
  })

  it('devuelve LCL cuando excede 40HC o el peso', () => {
    expect(recommendContainer(70, 10000)).toBe('LCL')
    expect(recommendContainer(10, 30000)).toBe('LCL')
  })

  it('fitsSingleFcl detecta carga multi-contenedor', () => {
    expect(fitsSingleFcl(68, 26000)).toBe(true)
    expect(fitsSingleFcl(68.1, 1000)).toBe(false)
  })
})

describe('landed-cost-prorater', () => {
  it('prorratea por CBM: flete compartido', () => {
    // Orden usa 14 m3 de un 40ST (58 m3) con flete 2900
    expect(prorateByCbm(2900, 14, 58).toString()).toBe('700')
  })

  it('prorratea por peso', () => {
    expect(prorateByWeight(2600, 5000, 26000).toString()).toBe('500')
  })

  it('prorratea por valor CIF', () => {
    expect(prorateByValue(1000, 25000, 100000).toString()).toBe('250')
  })

  it('prorate generico y validacion de total', () => {
    expect(prorate(100, 1, 4).toString()).toBe('25')
    expect(() => prorate(100, 1, 0)).toThrow()
  })
})
