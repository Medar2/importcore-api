import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../security/entities/user.entity';
import { Role } from '../../security/entities/role.entity';
import { Permission } from '../../security/entities/permission.entity';
import { Organization } from '../../organization/entities/organization.entity';
import * as bcrypt from 'bcrypt';

export interface LegacyUser {
  id: number;
  username: string;
  email: string;
  password: string;
  role: string;
  created_at: Date;
  updated_at: Date;
}

export interface LegacyRole {
  id: number;
  name: string;
  description: string;
  permissions: string[];
}

export interface MigrationResult {
  usersMigrated: number;
  rolesMigrated: number;
  permissionsMigrated: number;
  errors: string[];
}

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  /**
   * Migra usuarios desde un sistema legacy
   * Convierte contraseñas en texto plano a hashes bcrypt
   */
  async migrateUsers(
    legacyUsers: LegacyUser[],
    defaultOrganizationId?: string,
  ): Promise<number> {
    this.logger.log(`Migrating ${legacyUsers.length} users`);

    let migrated = 0;

    for (const legacyUser of legacyUsers) {
      try {
        // Verificar si el usuario ya existe
        const existingUser = await this.userRepository.findOne({
          where: { username: legacyUser.username },
        });

        if (existingUser) {
          this.logger.debug(
            `User ${legacyUser.email} already exists, skipping`,
          );
          continue;
        }

        // Hash de la contraseña legacy (asumiendo que está en texto plano)
        const passwordHash = await bcrypt.hash(legacyUser.password, 10);

        // Crear el usuario
        const user = this.userRepository.create({
          username: legacyUser.username,
          passwordHash,
          organizationId: defaultOrganizationId,
          status: 'active',
          emailVerified: true,
        });

        await this.userRepository.save(user);
        migrated++;

        this.logger.debug(`Migrated user: ${legacyUser.email}`);
      } catch (error) {
        this.logger.error(
          `Error migrating user ${legacyUser.email}: ${error.message}`,
        );
      }
    }

    this.logger.log(`Migrated ${migrated} users`);
    return migrated;
  }

  /**
   * Migra roles desde un sistema legacy
   */
  async migrateRoles(legacyRoles: LegacyRole[]): Promise<number> {
    this.logger.log(`Migrating ${legacyRoles.length} roles`);

    let migrated = 0;

    for (const legacyRole of legacyRoles) {
      try {
        // Verificar si el rol ya existe
        const existingRole = await this.roleRepository.findOne({
          where: { name: legacyRole.name },
        });

        if (existingRole) {
          this.logger.debug(`Role ${legacyRole.name} already exists, skipping`);
          continue;
        }

        // Buscar permisos correspondientes
        const permissions = await this.permissionRepository.find({
          where: legacyRole.permissions.map((code) => ({ code })),
        });

        // Crear el rol
        const role = this.roleRepository.create({
          name: legacyRole.name,
          description: legacyRole.description,
          isSystem: false,
          permissions,
        });

        await this.roleRepository.save(role);
        migrated++;

        this.logger.debug(`Migrated role: ${legacyRole.name}`);
      } catch (error) {
        this.logger.error(
          `Error migrating role ${legacyRole.name}: ${error.message}`,
        );
      }
    }

    this.logger.log(`Migrated ${migrated} roles`);
    return migrated;
  }

  /**
   * Migra estructura de permisos desde sistema legacy
   */
  async migratePermissions(
    legacyPermissions: { codigo: string; descripcion: string }[],
  ): Promise<number> {
    this.logger.log(`Migrating ${legacyPermissions.length} permissions`);

    let migrated = 0;

    for (const legacyPerm of legacyPermissions) {
      try {
        // Verificar si el permiso ya existe
        const existingPerm = await this.permissionRepository.findOne({
          where: { code: legacyPerm.codigo },
        });

        if (existingPerm) {
          continue;
        }

        // Parsear el código del permiso
        const [modulo, recurso, accion] = legacyPerm.codigo.split('.');

        // Crear el permiso
        const permission = this.permissionRepository.create({
          code: legacyPerm.codigo,
          name: legacyPerm.descripcion,
          module: modulo,
          resource: recurso,
          action: accion,
          description: legacyPerm.descripcion,
        });

        await this.permissionRepository.save(permission);
        migrated++;
      } catch (error) {
        this.logger.error(
          `Error migrating permission ${legacyPerm.codigo}: ${error.message}`,
        );
      }
    }

    this.logger.log(`Migrated ${migrated} permissions`);
    return migrated;
  }

  /**
   * Migra organizaciones desde sistema legacy
   */
  async migrateOrganizations(
    legacyOrgs: { name: string; slug: string; description?: string }[],
  ): Promise<number> {
    this.logger.log(`Migrating ${legacyOrgs.length} organizations`);

    let migrated = 0;

    for (const legacyOrg of legacyOrgs) {
      try {
        const existingOrg = await this.organizationRepository.findOne({
          where: { slug: legacyOrg.slug },
        });

        if (existingOrg) {
          continue;
        }

        const org = this.organizationRepository.create({
          name: legacyOrg.name,
          slug: legacyOrg.slug,
          description: legacyOrg.description,
          isActive: true,
        });

        await this.organizationRepository.save(org);
        migrated++;
      } catch (error) {
        this.logger.error(
          `Error migrating organization ${legacyOrg.name}: ${error.message}`,
        );
      }
    }

    this.logger.log(`Migrated ${migrated} organizations`);
    return migrated;
  }

  /**
   * Migra asignaciones de roles a usuarios
   */
  async migrateUserRoles(
    userRoleMappings: { userEmail: string; roleNames: string[] }[],
  ): Promise<number> {
    this.logger.log(`Migrating ${userRoleMappings.length} user-role mappings`);

    let migrated = 0;

    for (const mapping of userRoleMappings) {
      try {
        const user = await this.userRepository.findOne({
          where: { username: mapping.userEmail },
          relations: ['roles'],
        });

        if (!user) {
          this.logger.warn(`User ${mapping.userEmail} not found`);
          continue;
        }

        for (const roleName of mapping.roleNames) {
          const role = await this.roleRepository.findOne({
            where: { name: roleName },
          });

          if (role && !user.roles.some((r) => r.id === role.id)) {
            user.roles.push(role);
          }
        }

        await this.userRepository.save(user);
        migrated++;
      } catch (error) {
        this.logger.error(
          `Error migrating user roles for ${mapping.userEmail}: ${error.message}`,
        );
      }
    }

    this.logger.log(`Migrated ${migrated} user-role mappings`);
    return migrated;
  }

  /**
   * Ejecuta una migración completa
   */
  async executeFullMigration(
    data: {
      users?: LegacyUser[];
      roles?: LegacyRole[];
      permissions?: { codigo: string; descripcion: string }[];
      organizations?: { name: string; slug: string; description?: string }[];
      userRoles?: { userEmail: string; roleNames: string[] }[];
    },
    options?: {
      defaultOrganizationId?: string;
    },
  ): Promise<MigrationResult> {
    const result: MigrationResult = {
      usersMigrated: 0,
      rolesMigrated: 0,
      permissionsMigrated: 0,
      errors: [],
    };

    try {
      // 1. Migrar organizaciones primero
      if (data.organizations) {
        result.permissionsMigrated = await this.migrateOrganizations(
          data.organizations,
        );
      }

      // 2. Migrar permisos
      if (data.permissions) {
        result.permissionsMigrated = await this.migratePermissions(
          data.permissions,
        );
      }

      // 3. Migrar roles
      if (data.roles) {
        result.rolesMigrated = await this.migrateRoles(data.roles);
      }

      // 4. Migrar usuarios
      if (data.users) {
        result.usersMigrated = await this.migrateUsers(
          data.users,
          options?.defaultOrganizationId,
        );
      }

      // 5. Migrar asignaciones de roles
      if (data.userRoles) {
        await this.migrateUserRoles(data.userRoles);
      }

      this.logger.log('Migration completed successfully');
    } catch (error) {
      result.errors.push(error.message);
      this.logger.error(`Migration failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Valida que la migración fue exitosa
   */
  async validateMigration(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    // Verificar que hay al menos un usuario
    const userCount = await this.userRepository.count();
    if (userCount === 0) {
      issues.push('No users found after migration');
    }

    // Verificar que hay al menos un rol
    const roleCount = await this.roleRepository.count();
    if (roleCount === 0) {
      issues.push('No roles found after migration');
    }

    // Verificar que hay permisos
    const permCount = await this.permissionRepository.count();
    if (permCount === 0) {
      issues.push('No permissions found after migration');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}
