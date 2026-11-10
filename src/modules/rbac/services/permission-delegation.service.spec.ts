import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PermissionDelegationService } from './permission-delegation.service';
import { User } from '../../security/entities/user.entity';
import { Permission } from '../../security/entities/permission.entity';
import { PermissionDelegation } from '../../security/entities/permission-delegation.entity';
import { CacheService } from '../../cache/cache.service';
import { AuditService } from '../../audit/services/audit.service';

describe('PermissionDelegationService', () => {
  let service: PermissionDelegationService;

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockPermissionRepository = {
    findOne: jest.fn(),
  };

  const mockDelegationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockCacheService = {
    invalidateUserCache: jest.fn(),
  };

  const mockAuditService = {
    logPermissionChange: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionDelegationService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Permission),
          useValue: mockPermissionRepository,
        },
        {
          provide: getRepositoryToken(PermissionDelegation),
          useValue: mockDelegationRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<PermissionDelegationService>(
      PermissionDelegationService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('delegatePermissions', () => {
    it('should throw BadRequestException if startsAt >= expiresAt', async () => {
      const startsAt = new Date('2024-01-02');
      const expiresAt = new Date('2024-01-01');

      await expect(
        service.delegatePermissions(
          'delegator-id',
          'delegate-id',
          ['USERS.PROFILE.READ'],
          startsAt,
          expiresAt,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if delegator does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce(null);

      const startsAt = new Date('2024-01-01');
      const expiresAt = new Date('2024-01-02');

      await expect(
        service.delegatePermissions(
          'delegator-id',
          'delegate-id',
          ['USERS.PROFILE.READ'],
          startsAt,
          expiresAt,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if delegating to self', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 'user-id' });

      const startsAt = new Date('2024-01-01');
      const expiresAt = new Date('2024-01-02');

      await expect(
        service.delegatePermissions(
          'user-id',
          'user-id',
          ['USERS.PROFILE.READ'],
          startsAt,
          expiresAt,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if permission format is invalid', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 'user-id' });

      const startsAt = new Date('2024-01-01');
      const expiresAt = new Date('2024-01-02');

      await expect(
        service.delegatePermissions(
          'delegator-id',
          'delegate-id',
          ['INVALID_FORMAT'],
          startsAt,
          expiresAt,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revokeDelegation', () => {
    it('should throw NotFoundException if delegation does not exist', async () => {
      mockDelegationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.revokeDelegation('delegation-id', 'reason'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if delegation is already revoked', async () => {
      mockDelegationRepository.findOne.mockResolvedValue({
        id: 'delegation-id',
        isActive: false,
      });

      await expect(
        service.revokeDelegation('delegation-id', 'reason'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should revoke delegation and invalidate cache', async () => {
      const delegation = {
        id: 'delegation-id',
        isActive: true,
        delegateId: 'delegate-id',
      };

      mockDelegationRepository.findOne.mockResolvedValue(delegation);
      mockDelegationRepository.save.mockResolvedValue({
        ...delegation,
        isActive: false,
        revokedAt: expect.any(Date),
        revocationReason: 'reason',
      });

      await service.revokeDelegation('delegation-id', 'reason');

      expect(mockDelegationRepository.save).toHaveBeenCalled();
      expect(mockCacheService.invalidateUserCache).toHaveBeenCalledWith(
        'delegate-id',
      );
    });
  });

  describe('getActiveDelegations', () => {
    it('should return active delegations for a user', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const activeDelegation = {
        id: 'delegation-1',
        delegateId: 'user-id',
        isActive: true,
        startsAt: yesterday,
        expiresAt: tomorrow,
      };

      const expiredDelegation = {
        id: 'delegation-2',
        delegateId: 'user-id',
        isActive: true,
        startsAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
        expiresAt: yesterday,
      };

      mockDelegationRepository.find
        .mockResolvedValueOnce([activeDelegation, expiredDelegation])
        .mockResolvedValueOnce([]);

      const result = await service.getActiveDelegations('user-id');

      expect(result.received).toHaveLength(1);
      expect(result.received[0].id).toBe('delegation-1');
      expect(result.given).toHaveLength(0);
    });
  });
});
