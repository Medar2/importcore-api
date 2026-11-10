import { computeContainerOccupancy } from './container-occupancy.calculator';
import type { OccupantInputItem } from './container-occupancy.calculator';

describe('computeContainerOccupancy', () => {
  it('calculates 0% occupancy for an empty 20_ST container', () => {
    const result = computeContainerOccupancy('20_ST', []);
    expect(result.capacityCbm).toBe(28);
    expect(result.capacityKg).toBe(21500);
    expect(result.usedCbm).toBe(0);
    expect(result.usedKg).toBe(0);
    expect(result.remainingCbm).toBe(28);
    expect(result.remainingKg).toBe(21500);
    expect(result.occupancyCbmPercent).toBe(0);
    expect(result.occupancyKgPercent).toBe(0);
    expect(result.isOverloaded).toBe(false);
    expect(result.itemCount).toBe(0);
  });

  it('calculates occupancy correctly for a partially loaded 40_HC container', () => {
    const items: OccupantInputItem[] = [
      {
        id: '1',
        type: 'ORDER',
        reference: 'ORD-001',
        customerName: 'Cliente A',
        status: 'CONFIRMED',
        cbm: 34,
        weightKg: 13000,
      },
      {
        id: '2',
        type: 'QUOTE',
        reference: 'COT-002',
        customerName: 'Cliente B',
        status: 'ACCEPTED',
        cbm: 17,
        weightKg: 6500,
      },
    ];

    // 40_HC: usableCbm = 68, maxPayloadKg = 26000
    // totalCbm = 34 + 17 = 51 (75%)
    // totalKg = 13000 + 6500 = 19500 (75%)
    const result = computeContainerOccupancy('40_HC', items);

    expect(result.capacityCbm).toBe(68);
    expect(result.capacityKg).toBe(26000);
    expect(result.usedCbm).toBe(51);
    expect(result.usedKg).toBe(19500);
    expect(result.remainingCbm).toBe(17);
    expect(result.remainingKg).toBe(6500);
    expect(result.occupancyCbmPercent).toBe(75);
    expect(result.occupancyKgPercent).toBe(75);
    expect(result.isOverloaded).toBe(false);
    expect(result.itemCount).toBe(2);

    expect(result.items[0].cbmSharePercent).toBe(50);
    expect(result.items[1].cbmSharePercent).toBe(25);
  });

  it('flags overloaded container when CBM exceeds capacity', () => {
    const items: OccupantInputItem[] = [
      {
        id: '1',
        type: 'ORDER',
        reference: 'ORD-999',
        status: 'CONFIRMED',
        cbm: 30, // 20_ST usable is 28
        weightKg: 5000,
      },
    ];

    const result = computeContainerOccupancy('20_ST', items);
    expect(result.usedCbm).toBe(30);
    expect(result.remainingCbm).toBe(0);
    expect(result.occupancyCbmPercent).toBe(107.14);
    expect(result.isOverloaded).toBe(true);
  });

  it('handles LCL container without crashing on Infinity', () => {
    const items: OccupantInputItem[] = [
      {
        id: '1',
        type: 'ORDER',
        reference: 'ORD-LCL-1',
        status: 'CONFIRMED',
        cbm: 5,
        weightKg: 800,
      },
    ];

    const result = computeContainerOccupancy('LCL', items);
    expect(result.usedCbm).toBe(5);
    expect(result.usedKg).toBe(800);
    expect(result.isOverloaded).toBe(false);
  });
});
