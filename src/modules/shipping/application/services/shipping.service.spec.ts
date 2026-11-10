import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ShippingService } from './shipping.service';
import { ShipmentContainer } from '../../entities/shipment-container.entity';
import { Quote } from '../../../landed-cost/entities/quote.entity';
import { Order } from '../../../orders/entities/order.entity';
import { ContainerOrdersSyncService } from './container-orders-sync.service';

describe('ShippingService - occupancy and tracking', () => {
  let service: ShippingService;

  const mockContainerRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockQuoteRepo = {
    find: jest.fn(),
  };

  const mockOrderRepo = {
    find: jest.fn(),
  };

  const mockTrackingProvider = {
    track: jest.fn(),
  };

  const mockOrdersSync = {
    sync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingService,
        {
          provide: getRepositoryToken(ShipmentContainer),
          useValue: mockContainerRepo,
        },
        {
          provide: getRepositoryToken(Quote),
          useValue: mockQuoteRepo,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepo,
        },
        {
          provide: 'TRACKING_PROVIDER',
          useValue: mockTrackingProvider,
        },
        {
          provide: ContainerOrdersSyncService,
          useValue: mockOrdersSync,
        },
      ],
    }).compile();

    service = module.get<ShippingService>(ShippingService);
    jest.clearAllMocks();
  });

  it('computes occupancy for a container with assigned quotes and orders', async () => {
    const containerId = 'cont-123';
    mockContainerRepo.findOne.mockResolvedValue({
      id: containerId,
      containerNumber: 'COSU1234567',
      containerType: '20_ST',
      status: 'LOADED',
    });

    mockQuoteRepo.find.mockResolvedValue([
      {
        id: 'q-1',
        quoteNumber: 'COT-001',
        customerId: 'cust-1',
        customerName: 'Importadora Dominicana',
        status: 'ACCEPTED',
        calculationResult: {
          totals: {
            cbm: '14.0',
            weightKg: '10750',
          },
        },
      },
    ]);

    mockOrderRepo.find.mockResolvedValue([
      {
        id: 'ord-1',
        orderNumber: 'ORD-001',
        customerId: 'cust-2',
        status: 'CONFIRMED',
        customer: { name: 'Comercial del Este' },
        quote: {
          calculationResult: {
            totals: {
              cbm: '7.0',
              weightKg: '5375',
            },
          },
        },
      },
    ]);

    // 20_ST capacity: 28 CBM, 21500 kg
    // Used: 14 + 7 = 21 CBM (75.00%)
    // Weight: 10750 + 5375 = 16125 kg (75.00%)
    const res = await service.occupancy(containerId);

    expect(res.containerId).toBe(containerId);
    expect(res.containerNumber).toBe('COSU1234567');
    expect(res.capacityCbm).toBe(28);
    expect(res.usedCbm).toBe(21);
    expect(res.remainingCbm).toBe(7);
    expect(res.occupancyCbmPercent).toBe(75);
    expect(res.occupancyKgPercent).toBe(75);
    expect(res.isOverloaded).toBe(false);
    expect(res.itemCount).toBe(2);
    expect(res.items[0].reference).toBe('COT-001');
    expect(res.items[0].cbmSharePercent).toBe(50);
    expect(res.items[1].reference).toBe('ORD-001');
    expect(res.items[1].cbmSharePercent).toBe(25);
  });

  it('syncs tracking and propagates status to assigned orders', async () => {
    const containerId = 'cont-456';
    const mockContainer = {
      id: containerId,
      containerNumber: 'COSU7890123',
      containerType: '40_HC',
      status: 'LOADED',
      etd: null,
      eta: null,
      ata: null,
      notes: null,
    };

    mockContainerRepo.findOne.mockResolvedValue(mockContainer);
    mockContainerRepo.save.mockImplementation((c) => Promise.resolve(c));
    mockTrackingProvider.track.mockResolvedValue({
      containerNumber: 'COSU7890123',
      status: 'IN_TRANSIT',
      etd: '2026-11-01',
      eta: '2026-11-25',
      ata: null,
      currentLocation: 'Pacific Ocean',
      events: [],
    });

    const res = await service.syncTracking(containerId);

    expect(mockTrackingProvider.track).toHaveBeenCalledWith('COSU7890123', null);
    expect(res.container.status).toBe('IN_TRANSIT');
    expect(res.container.etd).toBe('2026-11-01');
    expect(res.container.eta).toBe('2026-11-25');
    expect(mockOrdersSync.sync).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'IN_TRANSIT' }),
    );
  });
});
