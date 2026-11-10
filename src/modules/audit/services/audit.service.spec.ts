import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  AuditService,
  AccessEvent,
  PermissionChangeEvent,
  AuthEvent,
  AuditFilters,
} from './audit.service';
import { AuditLog } from '../entities/audit-log.entity';

describe('AuditService', () => {
  let service: AuditService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logAccess', () => {
    it('should log access event successfully', async () => {
      const event: AccessEvent = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        organizationId: 'org-123',
        action: 'READ',
        resource: 'USERS',
        resourceId: 'resource-123',
        result: 'success',
        reason: 'Permission granted',
        metadata: { permissionChecked: 'USERS.READ' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        method: 'GET',
        endpoint: '/api/users',
      };

      const mockAuditLog = { id: 'audit-123', ...event };
      mockRepository.create.mockReturnValue(mockAuditLog);
      mockRepository.save.mockResolvedValue(mockAuditLog);

      await service.logAccess(event);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: event.userId,
          userEmail: event.userEmail,
          action: event.action,
          resource: event.resource,
          result: event.result,
        }),
      );
      expect(mockRepository.save).toHaveBeenCalledWith(mockAuditLog);
    });

    it('should not throw error if logging fails', async () => {
      const event: AccessEvent = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        action: 'READ',
        resource: 'USERS',
        result: 'success',
      };

      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockRejectedValue(new Error('Database error'));
      const errorSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation();

      await expect(service.logAccess(event)).resolves.not.toThrow();
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('logPermissionChange', () => {
    it('should log permission change event successfully', async () => {
      const event: PermissionChangeEvent = {
        userId: 'user-123',
        userEmail: 'admin@example.com',
        organizationId: 'org-123',
        action: 'PERMISSION_GRANTED',
        resource: 'PERMISSION',
        resourceId: 'perm-123',
        metadata: { permissionCode: 'USERS.WRITE' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const mockAuditLog = { id: 'audit-123', ...event };
      mockRepository.create.mockReturnValue(mockAuditLog);
      mockRepository.save.mockResolvedValue(mockAuditLog);

      await service.logPermissionChange(event);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: event.userId,
          userEmail: event.userEmail,
          action: event.action,
          resource: event.resource,
          result: 'success',
        }),
      );
      expect(mockRepository.save).toHaveBeenCalledWith(mockAuditLog);
    });
  });

  describe('logAuthEvent', () => {
    it('should log successful auth event', async () => {
      const event: AuthEvent = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        organizationId: 'org-123',
        action: 'LOGIN_SUCCESS',
        metadata: { mfaUsed: true },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const mockAuditLog = { id: 'audit-123', ...event };
      mockRepository.create.mockReturnValue(mockAuditLog);
      mockRepository.save.mockResolvedValue(mockAuditLog);

      await service.logAuthEvent(event);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: event.userId,
          userEmail: event.userEmail,
          action: event.action,
          resource: 'AUTH',
          result: 'success',
        }),
      );
      expect(mockRepository.save).toHaveBeenCalledWith(mockAuditLog);
    });

    it('should log failed auth event with failure result', async () => {
      const event: AuthEvent = {
        userEmail: 'test@example.com',
        action: 'LOGIN_FAILED',
        metadata: { reason: 'Invalid password' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const mockAuditLog = { id: 'audit-123', ...event };
      mockRepository.create.mockReturnValue(mockAuditLog);
      mockRepository.save.mockResolvedValue(mockAuditLog);

      await service.logAuthEvent(event);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: event.action,
          resource: 'AUTH',
          result: 'failure',
        }),
      );
    });
  });

  describe('queryLogs', () => {
    it('should query logs with filters', async () => {
      const filters: AuditFilters = {
        userId: 'user-123',
        action: 'READ',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.queryLogs(filters);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('audit');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.userId = :userId',
        {
          userId: filters.userId,
        },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit.action = :action',
        {
          action: filters.action,
        },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'audit.timestamp',
        'DESC',
      );
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(1000);
      expect(result).toEqual([]);
    });

    it('should query logs without filters', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.queryLogs({});

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'audit.timestamp',
        'DESC',
      );
    });
  });

  describe('exportLogs', () => {
    const mockLogs = [
      {
        id: 'audit-1',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        userId: 'user-123',
        userEmail: 'test@example.com',
        organizationId: 'org-123',
        action: 'READ',
        resource: 'USERS',
        resourceId: 'resource-123',
        result: 'success',
        reason: null,
        metadata: {},
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        method: 'GET',
        endpoint: '/api/users',
      },
    ];

    beforeEach(() => {
      jest.spyOn(service, 'queryLogs').mockResolvedValue(mockLogs as any);
    });

    it('should export logs in JSON format', async () => {
      const buffer = await service.exportLogs({}, 'json');

      expect(buffer).toBeInstanceOf(Buffer);
      const jsonString = buffer.toString('utf-8');
      const parsed = JSON.parse(jsonString);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].userId).toBe('user-123');
      expect(parsed[0].action).toBe('READ');
    });

    it('should export logs in CSV format', async () => {
      const buffer = await service.exportLogs({}, 'csv');

      expect(buffer).toBeInstanceOf(Buffer);
      const csvString = buffer.toString('utf-8');
      expect(csvString).toContain('timestamp,userId,userEmail');
      expect(csvString).toContain('user-123');
      expect(csvString).toContain('test@example.com');
    });
  });

  describe('getStats', () => {
    it('should return statistics from logs', async () => {
      const mockLogs = [
        {
          action: 'READ',
          result: 'success',
          resource: 'USERS',
        },
        {
          action: 'READ',
          result: 'denied',
          resource: 'USERS',
        },
        {
          action: 'WRITE',
          result: 'success',
          resource: 'ROLES',
        },
      ];

      jest.spyOn(service, 'queryLogs').mockResolvedValue(mockLogs as any);

      const stats = await service.getStats({});

      expect(stats.totalLogs).toBe(3);
      expect(stats.byAction).toEqual({
        READ: 2,
        WRITE: 1,
      });
      expect(stats.byResult).toEqual({
        success: 2,
        denied: 1,
      });
      expect(stats.byResource).toEqual({
        USERS: 2,
        ROLES: 1,
      });
    });

    it('should return empty stats for no logs', async () => {
      jest.spyOn(service, 'queryLogs').mockResolvedValue([]);

      const stats = await service.getStats({});

      expect(stats.totalLogs).toBe(0);
      expect(stats.byAction).toEqual({});
      expect(stats.byResult).toEqual({});
      expect(stats.byResource).toEqual({});
    });
  });
});
