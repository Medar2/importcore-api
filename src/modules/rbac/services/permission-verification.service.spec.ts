import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  PermissionVerificationService,
  PermissionContext,
  UserPermissionInfo,
} from './permission-verification.service';
import { User } from '../../security/entities/user.entity';
import { Permission } from '../../security/entities/permission.entity';
import { UserPermission } from '../../security/entities/user-permission.entity';
import { RolePermission } from '../../security/entities/role-permission.entity';
import { PermissionDelegation } from '../../security/entities/permission-delegation.entity';
import { CacheService } from '../../cache/cache.service';

describe('PermissionVerificationService', () => {
  let service: PermissionVerificationService;

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockPermissionRepository = {
    findOne: jest.fn(),
  };

  const mockUserPermissionRepository = {
    find: jest.fn(),
  };

  const mockRolePermissionRepository = {
    find: jest.fn(),
  };

  const mockDelegationRepository = {
    find: jest.fn(),
  };

  const mockCacheService = {
    getUserPermissions: jest.fn(),
    setUserPermissions: jest.fn(),
    invalidateUserCache: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionVerificationService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Permission),
          useValue: mockPermissionRepository,
        },
        {
          provide: getRepositoryToken(UserPermission),
          useValue: mockUserPermissionRepository,
        },
        {
          provide: getRepositoryToken(RolePermission),
          useValue: mockRolePermissionRepository,
        },
        {
          provide: getRepositoryToken(PermissionDelegation),
          useValue: mockDelegationRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<PermissionVerificationService>(
      PermissionVerificationService,
    );

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('wildcardMatch', () => {
    it('should match exact permission', () => {
      const result = service.wildcardMatch(
        'USERS.PROFILE.READ',
        'USERS.PROFILE.READ',
      );
      expect(result).toBe(true);
    });

    it('should match wildcard in resource position (USERS.*.READ)', () => {
      const result = service.wildcardMatch(
        'USERS.*.READ',
        'USERS.PROFILE.READ',
      );
      expect(result).toBe(true);
    });

    it('should match wildcard in action position (USERS.PROFILE.*)', () => {
      const result = service.wildcardMatch(
        'USERS.PROFILE.*',
        'USERS.PROFILE.READ',
      );
      expect(result).toBe(true);
    });

    it('should match multiple wildcards (USERS.*.*)', () => {
      const result = service.wildcardMatch('USERS.*.*', 'USERS.PROFILE.READ');
      expect(result).toBe(true);
    });

    it('should not match different module', () => {
      const result = service.wildcardMatch(
        'USERS.*.READ',
        'POSTS.PROFILE.READ',
      );
      expect(result).toBe(false);
    });

    it('should not match different resource when not wildcard', () => {
      const result = service.wildcardMatch(
        'USERS.PROFILE.READ',
        'USERS.SETTINGS.READ',
      );
      expect(result).toBe(false);
    });

    it('should not match different action when not wildcard', () => {
      const result = service.wildcardMatch(
        'USERS.PROFILE.READ',
        'USERS.PROFILE.WRITE',
      );
      expect(result).toBe(false);
    });

    it('should not match invalid format', () => {
      const result = service.wildcardMatch(
        'USERS.PROFILE',
        'USERS.PROFILE.READ',
      );
      expect(result).toBe(false);
    });
  });

  describe('contextMatches', () => {
    it('should match when contexts are identical', () => {
      const permContext: PermissionContext = { organizationId: 'org1' };
      const reqContext: PermissionContext = { organizationId: 'org1' };
      const result = service.contextMatches(permContext, reqContext);
      expect(result).toBe(true);
    });

    it('should not match when organizationId differs', () => {
      const permContext: PermissionContext = { organizationId: 'org1' };
      const reqContext: PermissionContext = { organizationId: 'org2' };
      const result = service.contextMatches(permContext, reqContext);
      expect(result).toBe(false);
    });

    it('should match when permission context is more general', () => {
      const permContext: PermissionContext = { organizationId: 'org1' };
      const reqContext: PermissionContext = {
        organizationId: 'org1',
        projectId: 'proj1',
      };
      const result = service.contextMatches(permContext, reqContext);
      expect(result).toBe(true);
    });

    it('should not match when projectId differs', () => {
      const permContext: PermissionContext = {
        organizationId: 'org1',
        projectId: 'proj1',
      };
      const reqContext: PermissionContext = {
        organizationId: 'org1',
        projectId: 'proj2',
      };
      const result = service.contextMatches(permContext, reqContext);
      expect(result).toBe(false);
    });

    it('should not match when resourceId differs', () => {
      const permContext: PermissionContext = {
        organizationId: 'org1',
        resourceId: 'res1',
      };
      const reqContext: PermissionContext = {
        organizationId: 'org1',
        resourceId: 'res2',
      };
      const result = service.contextMatches(permContext, reqContext);
      expect(result).toBe(false);
    });

    it('should match when custom context fields match', () => {
      const permContext: PermissionContext = {
        organizationId: 'org1',
        customField: 'value1',
      };
      const reqContext: PermissionContext = {
        organizationId: 'org1',
        customField: 'value1',
      };
      const result = service.contextMatches(permContext, reqContext);
      expect(result).toBe(true);
    });

    it('should not match when custom context fields differ', () => {
      const permContext: PermissionContext = {
        organizationId: 'org1',
        customField: 'value1',
      };
      const reqContext: PermissionContext = {
        organizationId: 'org1',
        customField: 'value2',
      };
      const result = service.contextMatches(permContext, reqContext);
      expect(result).toBe(false);
    });
  });

  describe('isPermissionActive', () => {
    it('should return true for permission without temporal constraints', () => {
      const permission = {
        type: 'direct',
        startsAt: null,
        expiresAt: null,
        approvalStatus: null,
      } as UserPermission;

      const result = service.isPermissionActive(permission);
      expect(result).toBe(true);
    });

    it('should return false for permission that has not started yet', () => {
      const futureDate = new Date(Date.now() + 86400000); // +1 day
      const permission = {
        type: 'temporary',
        startsAt: futureDate,
        expiresAt: null,
        approvalStatus: null,
      } as UserPermission;

      const result = service.isPermissionActive(permission);
      expect(result).toBe(false);
    });

    it('should return false for expired permission', () => {
      const pastDate = new Date(Date.now() - 86400000); // -1 day
      const permission = {
        type: 'temporary',
        startsAt: null,
        expiresAt: pastDate,
        approvalStatus: null,
      } as UserPermission;

      const result = service.isPermissionActive(permission);
      expect(result).toBe(false);
    });

    it('should return true for permission within valid time range', () => {
      const pastDate = new Date(Date.now() - 86400000); // -1 day
      const futureDate = new Date(Date.now() + 86400000); // +1 day
      const permission = {
        type: 'temporary',
        startsAt: pastDate,
        expiresAt: futureDate,
        approvalStatus: null,
      } as UserPermission;

      const result = service.isPermissionActive(permission);
      expect(result).toBe(true);
    });

    it('should return false for provisional permission that is not approved', () => {
      const permission = {
        type: 'provisional',
        startsAt: null,
        expiresAt: null,
        approvalStatus: 'pending',
      } as UserPermission;

      const result = service.isPermissionActive(permission);
      expect(result).toBe(false);
    });

    it('should return true for approved provisional permission', () => {
      const permission = {
        type: 'provisional',
        startsAt: null,
        expiresAt: null,
        approvalStatus: 'approved',
      } as UserPermission;

      const result = service.isPermissionActive(permission);
      expect(result).toBe(true);
    });
  });

  describe('checkPermissionMatch', () => {
    it('should return true when exact permission exists', () => {
      const userPermissions: UserPermissionInfo[] = [
        { code: 'USERS.PROFILE.READ', source: 'direct' },
      ];

      const result = service.checkPermissionMatch(
        'USERS.PROFILE.READ',
        userPermissions,
      );
      expect(result).toBe(true);
    });

    it('should return true when wildcard permission matches', () => {
      const userPermissions: UserPermissionInfo[] = [
        { code: 'USERS.*.READ', source: 'role' },
      ];

      const result = service.checkPermissionMatch(
        'USERS.PROFILE.READ',
        userPermissions,
      );
      expect(result).toBe(true);
    });

    it('should return false when no permission matches', () => {
      const userPermissions: UserPermissionInfo[] = [
        { code: 'USERS.PROFILE.WRITE', source: 'direct' },
      ];

      const result = service.checkPermissionMatch(
        'USERS.PROFILE.READ',
        userPermissions,
      );
      expect(result).toBe(false);
    });

    it('should return true when permission with matching context exists', () => {
      const userPermissions: UserPermissionInfo[] = [
        {
          code: 'USERS.PROFILE.READ',
          source: 'direct',
          context: { organizationId: 'org1' },
        },
      ];

      const result = service.checkPermissionMatch(
        'USERS.PROFILE.READ',
        userPermissions,
        { organizationId: 'org1' },
      );
      expect(result).toBe(true);
    });

    it('should return false when context does not match', () => {
      const userPermissions: UserPermissionInfo[] = [
        {
          code: 'USERS.PROFILE.READ',
          source: 'direct',
          context: { organizationId: 'org1' },
        },
      ];

      const result = service.checkPermissionMatch(
        'USERS.PROFILE.READ',
        userPermissions,
        { organizationId: 'org2' },
      );
      expect(result).toBe(false);
    });

    it('should return true when permission has no context constraint', () => {
      const userPermissions: UserPermissionInfo[] = [
        { code: 'USERS.PROFILE.READ', source: 'direct' },
      ];

      const result = service.checkPermissionMatch(
        'USERS.PROFILE.READ',
        userPermissions,
        { organizationId: 'org1' },
      );
      expect(result).toBe(true);
    });
  });

  describe('getUserPermissions', () => {
    it('should return permissions from roles', async () => {
      const mockUser = {
        id: 'user1',
        roles: [
          {
            id: 'role1',
            rolePermissions: [
              {
                permission: { code: 'USERS.PROFILE.READ' },
                context: null,
              },
            ],
          },
        ],
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserPermissionRepository.find.mockResolvedValue([]);
      mockDelegationRepository.find.mockResolvedValue([]);

      const result = await service.getUserPermissions('user1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        code: 'USERS.PROFILE.READ',
        source: 'role',
        context: undefined,
      });
    });

    it('should return direct permissions', async () => {
      const mockUser = {
        id: 'user1',
        roles: [],
      };

      const mockDirectPermission = {
        userId: 'user1',
        permission: { code: 'USERS.PROFILE.WRITE' },
        type: 'direct',
        context: null,
        startsAt: null,
        expiresAt: null,
        approvalStatus: null,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserPermissionRepository.find.mockResolvedValue([
        mockDirectPermission,
      ]);
      mockDelegationRepository.find.mockResolvedValue([]);

      const result = await service.getUserPermissions('user1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        code: 'USERS.PROFILE.WRITE',
        source: 'direct',
        context: undefined,
        startsAt: undefined,
        expiresAt: undefined,
      });
    });

    it('should return delegated permissions', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 86400000);

      const mockUser = {
        id: 'user1',
        roles: [],
      };

      const mockDelegation = {
        delegateId: 'user1',
        permissionCodes: ['USERS.PROFILE.DELETE'],
        startsAt: now,
        expiresAt: futureDate,
        isActive: true,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserPermissionRepository.find.mockResolvedValue([]);
      mockDelegationRepository.find.mockResolvedValue([mockDelegation]);

      const result = await service.getUserPermissions('user1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        code: 'USERS.PROFILE.DELETE',
        source: 'delegated',
        startsAt: now,
        expiresAt: futureDate,
      });
    });

    it('should filter out inactive direct permissions', async () => {
      const pastDate = new Date(Date.now() - 86400000);

      const mockUser = {
        id: 'user1',
        roles: [],
      };

      const mockExpiredPermission = {
        userId: 'user1',
        permission: { code: 'USERS.PROFILE.WRITE' },
        type: 'temporary',
        context: null,
        startsAt: null,
        expiresAt: pastDate,
        approvalStatus: null,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserPermissionRepository.find.mockResolvedValue([
        mockExpiredPermission,
      ]);
      mockDelegationRepository.find.mockResolvedValue([]);

      const result = await service.getUserPermissions('user1');

      expect(result).toHaveLength(0);
    });

    it('should filter out expired delegations', async () => {
      const pastDate = new Date(Date.now() - 86400000);

      const mockUser = {
        id: 'user1',
        roles: [],
      };

      const mockExpiredDelegation = {
        delegateId: 'user1',
        permissionCodes: ['USERS.PROFILE.DELETE'],
        startsAt: pastDate,
        expiresAt: pastDate,
        isActive: true,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserPermissionRepository.find.mockResolvedValue([]);
      mockDelegationRepository.find.mockResolvedValue([mockExpiredDelegation]);

      const result = await service.getUserPermissions('user1');

      expect(result).toHaveLength(0);
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has the required permission', async () => {
      const mockUser = {
        id: 'user1',
        roles: [
          {
            id: 'role1',
            rolePermissions: [
              {
                permission: { code: 'USERS.PROFILE.READ' },
                context: null,
              },
            ],
          },
        ],
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserPermissionRepository.find.mockResolvedValue([]);
      mockDelegationRepository.find.mockResolvedValue([]);

      const result = await service.hasPermission('user1', 'USERS.PROFILE.READ');

      expect(result).toBe(true);
    });

    it('should return false when user does not have the required permission', async () => {
      const mockUser = {
        id: 'user1',
        roles: [],
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserPermissionRepository.find.mockResolvedValue([]);
      mockDelegationRepository.find.mockResolvedValue([]);

      const result = await service.hasPermission('user1', 'USERS.PROFILE.READ');

      expect(result).toBe(false);
    });

    it('should respect context when checking permissions', async () => {
      const mockUser = {
        id: 'user1',
        roles: [
          {
            id: 'role1',
            rolePermissions: [
              {
                permission: { code: 'USERS.PROFILE.READ' },
                context: { organizationId: 'org1' },
              },
            ],
          },
        ],
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserPermissionRepository.find.mockResolvedValue([]);
      mockDelegationRepository.find.mockResolvedValue([]);

      const resultMatch = await service.hasPermission(
        'user1',
        'USERS.PROFILE.READ',
        { organizationId: 'org1' },
      );
      expect(resultMatch).toBe(true);

      const resultNoMatch = await service.hasPermission(
        'user1',
        'USERS.PROFILE.READ',
        { organizationId: 'org2' },
      );
      expect(resultNoMatch).toBe(false);
    });
  });
});
