import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../entities/organization.entity';
import { User } from '../../security/entities/user.entity';
import { CacheService } from '../../cache/cache.service';
import { AuditService } from '../../audit/services/audit.service';

export interface OrganizationSettings {
  mfaRequired?: boolean;
  sessionTimeout?: number; // minutos
  passwordPolicy?: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
  };
  maxSessionPerUser?: number;
  allowConcurrentSessions?: boolean;
}

export interface CreateOrganizationDto {
  name: string;
  description?: string;
  parentId?: string;
  settings?: OrganizationSettings;
}

export interface UpdateOrganizationDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  parentId?: string;
  settings?: OrganizationSettings;
}

export interface OrganizationFilters {
  isActive?: boolean;
  parentId?: string;
}

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cacheService: CacheService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Crea una nueva organización
   */
  async createOrganization(
    createOrgDto: CreateOrganizationDto,
    _createdBy: string,
  ): Promise<Organization> {
    this.logger.log(`Creating organization: ${createOrgDto.name}`);

    // Generar slug único
    const slug = this.generateSlug(createOrgDto.name);

    // Verificar que no existe una organización con el mismo slug
    const existingOrg = await this.organizationRepository.findOne({
      where: { slug },
    });

    if (existingOrg) {
      throw new BadRequestException(
        `Organization with name '${createOrgDto.name}' already exists`,
      );
    }

    // Verificar que la organización padre existe si se proporciona
    if (createOrgDto.parentId) {
      const parent = await this.organizationRepository.findOne({
        where: { id: createOrgDto.parentId },
      });
      if (!parent) {
        throw new NotFoundException(
          `Parent organization with ID ${createOrgDto.parentId} not found`,
        );
      }
    }

    // Crear la organización
    const organization = this.organizationRepository.create({
      name: createOrgDto.name,
      slug,
      description: createOrgDto.description,
      parentId: createOrgDto.parentId || null,
      settings: createOrgDto.settings || {},
      isActive: true,
    });

    const savedOrg = await this.organizationRepository.save(organization);

    this.logger.log(`Organization ${savedOrg.id} created successfully`);

    return savedOrg;
  }

  /**
   * Actualiza una organización existente
   */
  async updateOrganization(
    orgId: string,
    updateOrgDto: UpdateOrganizationDto,
    _updatedBy: string,
  ): Promise<Organization> {
    this.logger.log(`Updating organization: ${orgId}`);

    const organization = await this.organizationRepository.findOne({
      where: { id: orgId },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${orgId} not found`);
    }

    // Actualizar campos
    if (updateOrgDto.name && updateOrgDto.name !== organization.name) {
      organization.slug = this.generateSlug(updateOrgDto.name);
    }

    Object.assign(organization, {
      name: updateOrgDto.name,
      description: updateOrgDto.description,
      isActive: updateOrgDto.isActive,
      parentId: updateOrgDto.parentId,
      settings: updateOrgDto.settings
        ? { ...organization.settings, ...updateOrgDto.settings }
        : organization.settings,
    });

    const savedOrg = await this.organizationRepository.save(organization);

    // Invalidar caché
    await this.cacheService.invalidateOrganizationCache(orgId);

    this.logger.log(`Organization ${orgId} updated successfully`);

    return savedOrg;
  }

  /**
   * Elimina una organización (soft delete)
   */
  async deleteOrganization(orgId: string): Promise<void> {
    this.logger.log(`Deleting organization: ${orgId}`);

    const organization = await this.organizationRepository.findOne({
      where: { id: orgId },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${orgId} not found`);
    }

    // Soft delete
    organization.isActive = false;
    await this.organizationRepository.save(organization);

    // Invalidar caché
    await this.cacheService.invalidateOrganizationCache(orgId);

    this.logger.log(`Organization ${orgId} deleted successfully`);
  }

  /**
   * Obtiene una organización por ID
   */
  async getOrganization(orgId: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id: orgId },
      relations: ['parent', 'children'],
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${orgId} not found`);
    }

    return organization;
  }

  /**
   * Lista organizaciones con filtros
   */
  async listOrganizations(
    filters: OrganizationFilters,
  ): Promise<Organization[]> {
    const query = this.organizationRepository
      .createQueryBuilder('org')
      .leftJoinAndSelect('org.parent', 'parent')
      .leftJoinAndSelect('org.children', 'children');

    if (filters.isActive !== undefined) {
      query.andWhere('org.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    if (filters.parentId !== undefined) {
      query.andWhere('org.parentId = :parentId', {
        parentId: filters.parentId,
      });
    }

    query.orderBy('org.name', 'ASC');

    return query.getMany();
  }

  /**
   * Obtiene usuarios de una organización
   */
  async getOrganizationUsers(orgId: string): Promise<User[]> {
    const organization = await this.organizationRepository.findOne({
      where: { id: orgId },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${orgId} not found`);
    }

    return this.userRepository.find({
      where: { organizationId: orgId },
      relations: ['roles'],
    });
  }

  /**
   * Actualiza la configuración de una organización
   */
  async updateOrganizationSettings(
    orgId: string,
    settings: OrganizationSettings,
  ): Promise<Organization> {
    this.logger.log(`Updating organization settings: ${orgId}`);

    const organization = await this.organizationRepository.findOne({
      where: { id: orgId },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${orgId} not found`);
    }

    // Validar settings
    this.validateSettings(settings);

    // Actualizar settings
    organization.settings = {
      ...(organization.settings as any),
      ...settings,
    };
    const savedOrg = await this.organizationRepository.save(organization);

    // Invalidar caché
    await this.cacheService.invalidateOrganizationCache(orgId);

    this.logger.log(`Organization settings ${orgId} updated successfully`);

    return savedOrg;
  }

  /**
   * Obtiene la configuración de una organización
   */
  async getOrganizationSettings(orgId: string): Promise<OrganizationSettings> {
    const organization = await this.organizationRepository.findOne({
      where: { id: orgId },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${orgId} not found`);
    }

    return organization.settings || {};
  }

  /**
   * Verifica si un usuario es superadmin (puede acceder a todas las organizaciones)
   */
  async isSuperAdmin(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      return false;
    }

    // Verificar si tiene rol de superadmin
    return user.roles.some(
      (role: any) => role.name === 'superadmin' || role.isSystem,
    );
  }

  /**
   * Genera un slug único a partir del nombre
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres no alfanuméricos
      .replace(/^-|-$/g, ''); // Quitar guiones al inicio y final
  }

  /**
   * Valida la configuración de la organización
   */
  private validateSettings(settings: OrganizationSettings): void {
    if (settings.sessionTimeout !== undefined) {
      if (settings.sessionTimeout < 5 || settings.sessionTimeout > 1440) {
        throw new BadRequestException(
          'sessionTimeout must be between 5 and 1440 minutes',
        );
      }
    }

    if (settings.passwordPolicy) {
      const {
        minLength,
        requireUppercase,
        requireLowercase,
        requireNumbers,
        requireSpecialChars,
      } = settings.passwordPolicy;

      if (minLength !== undefined && (minLength < 8 || minLength > 128)) {
        throw new BadRequestException(
          'passwordPolicy.minLength must be between 8 and 128',
        );
      }

      const hasAnyRequirement =
        requireUppercase ||
        requireLowercase ||
        requireNumbers ||
        requireSpecialChars;
      if (minLength && minLength > 0 && !hasAnyRequirement) {
        throw new BadRequestException(
          'At least one password requirement must be enabled',
        );
      }
    }

    if (settings.maxSessionPerUser !== undefined) {
      if (settings.maxSessionPerUser < 1 || settings.maxSessionPerUser > 10) {
        throw new BadRequestException(
          'maxSessionPerUser must be between 1 and 10',
        );
      }
    }
  }
}
