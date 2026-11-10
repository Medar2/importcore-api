import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { Order } from '../../entities/order.entity';
import { OrderPayment } from '../../entities/order-payment.entity';
import { Quote } from '../../../landed-cost/entities/quote.entity';

describe('OrdersService - tracking', () => {
  let service: OrdersService;

  const mockOrderRepo = {
    findOne: jest.fn(),
  };

  const mockPaymentRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockQuoteRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepo,
        },
        {
          provide: getRepositoryToken(OrderPayment),
          useValue: mockPaymentRepo,
        },
        {
          provide: getRepositoryToken(Quote),
          useValue: mockQuoteRepo,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  it('notifies client of pending balance when container and order have arrived', async () => {
    const orderId = 'ord-123';
    const mockOrder = {
      id: orderId,
      orderNumber: 'OD-20261110-XYZ1',
      status: 'ARRIVED',
      totalUsd: '5000.00',
      customer: { name: 'Comercial ABC' },
      container: {
        id: 'cont-1',
        containerNumber: 'COSU9876543',
        containerType: '40_HC',
        status: 'ARRIVED',
        etd: '2026-10-15',
        eta: '2026-11-09',
        ata: '2026-11-09',
      },
    };

    mockOrderRepo.findOne.mockResolvedValue(mockOrder);

    // Mock query builder for balance (paid $2,000, leaving $3,000 pending)
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ total: '2000.00' }),
    };
    mockPaymentRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const tracking = await service.tracking(orderId);

    expect(tracking.orderId).toBe(orderId);
    expect(tracking.status).toBe('ARRIVED');
    expect(tracking.financial.totalUsd).toBe('5000');
    expect(tracking.financial.paidUsd).toBe('2000');
    expect(tracking.financial.balanceUsd).toBe('3000');
    expect(tracking.financial.dispatchLocked).toBe(true);
    expect(tracking.liberationMessage).toContain('saldo pendiente de US$ 3000.00');
    expect(tracking.container?.containerNumber).toBe('COSU9876543');
  });

  it('indicates release readiness when order arrived and is fully paid', async () => {
    const orderId = 'ord-456';
    const mockOrder = {
      id: orderId,
      orderNumber: 'OD-20261110-XYZ2',
      status: 'ARRIVED',
      totalUsd: '5000.00',
      customer: { name: 'Comercial ABC' },
      container: {
        id: 'cont-1',
        containerNumber: 'COSU9876543',
        status: 'ARRIVED',
      },
    };

    mockOrderRepo.findOne.mockResolvedValue(mockOrder);

    // Mock fully paid
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ total: '5000.00' }),
    };
    mockPaymentRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const tracking = await service.tracking(orderId);

    expect(tracking.financial.dispatchLocked).toBe(false);
    expect(tracking.financial.balanceUsd).toBe('0');
    expect(tracking.liberationMessage).toContain('saldo está liquidado');
  });
});
