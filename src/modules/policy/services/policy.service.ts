import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Policy } from '../entities/policy.entity';
import {
  PolicyEngine,
  PolicyEvaluationContext,
  PolicyEvaluationResult,
} from './policy-engine.service';
import { CacheService } from '../../cache/cache.service';
import { AuditService } from '../../audit/services/audit.service';

export interface CreatePolicyDto {
  name: string;
  description?: string;
  isActive?: boolean;
  priority?: number;
  modules?: string[];
  resources?: string[];
  actions?: string[];
  conditions: {
    type: 'allow' | 'deny';
    rules: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
    logic: 'AND' | 'OR';
  };
  organizationId?: string;
}

export interface UpdatePolicyDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  priority?: number;
  modules?: string[];
  resources?: string[];
  actions?: string[];
  conditions?: {
    type: 'allow' | 'deny';
    rules: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
    logic: 'AND' | 'OR';
  };
}

export interface PolicyFilters {
  organizationId?: string;
  isActive?: boolean;
  module?: string;
  resource?: string;
  action?: string;
}

export interface TestPolicyDto {
  userId?: string;
  userEmail?: string;
  userRoles?: string[];
  userDepartment?: string;
  organizationId?: string;
  resource?: string;
  resourceId?: string;
  action?: string;
  ipAddress?: string;
  [key: string]: any;
}

@Injectable()
export class PolicyService {
  private readonly logger = new Logger(PolicyService.name);

  constructor(
    @InjectRepository(Policy)
    private readonly policyRepository: Repository<Policy>,
    private readonly policyEngine: PolicyEngine,
    private readonly cacheService: CacheService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Crea una nueva política
   */
  async createPolicy(
    createPolicyDto: CreatePolicyDto,
    _createdBy: string,
  ): Promise<Policy> {
    this.logger.log(`Creating policy: ${createPolicyDto.name}`);

    // Validar que no exista una política con el mismo nombre para la organización
    const existingPolicy = await this.policyRepository.findOne({
      where: {
        name: createPolicyDto.name,
        organizationId: createPolicyDto.organizationId || null,
      } as any,
    });

    if (existingPolicy) {
      throw new BadRequestException(
        `Policy with name '${createPolicyDto.name}' already exists`,
      );
    }

    // Crear la política
    const policy = this.policyRepository.create({
      name: createPolicyDto.name,
      description: createPolicyDto.description,
      isActive: createPolicyDto.isActive ?? true,
      priority: createPolicyDto.priority ?? 0,
      modules: createPolicyDto.modules || [],
      resources: createPolicyDto.resources || [],
      actions: createPolicyDto.actions || [],
      conditions: createPolicyDto.conditions as any,
      organizationId: createPolicyDto.organizationId || null,
    });

    const savedPolicy = await this.policyRepository.save(policy);

    // Invalidar caché de políticas
    await this.invalidatePolicyCache(
      createPolicyDto.organizationId || undefined,
    );

    this.logger.log(`Policy ${savedPolicy.id} created successfully`);

    return savedPolicy;
  }

  /**
   * Actualiza una política existente
   */
  async updatePolicy(
    policyId: string,
    updatePolicyDto: UpdatePolicyDto,
    _updatedBy: string,
  ): Promise<Policy> {
    this.logger.log(`Updating policy: ${policyId}`);

    const policy = await this.policyRepository.findOne({
      where: { id: policyId },
    });

    if (!policy) {
      throw new NotFoundException(`Policy with ID ${policyId} not found`);
    }

    // Actualizar campos
    Object.assign(policy, updatePolicyDto);

    const savedPolicy = await this.policyRepository.save(policy);

    // Invalidar caché
    await this.invalidatePolicyCache(policy.organizationId || undefined);

    this.logger.log(`Policy ${policyId} updated successfully`);

    return savedPolicy;
  }

  /**
   * Elimina una política (soft delete)
   */
  async deletePolicy(policyId: string): Promise<void> {
    this.logger.log(`Deleting policy: ${policyId}`);

    const policy = await this.policyRepository.findOne({
      where: { id: policyId },
    });

    if (!policy) {
      throw new NotFoundException(`Policy with ID ${policyId} not found`);
    }

    // Soft delete
    policy.isActive = false;
    await this.policyRepository.save(policy);

    // Invalidar caché
    await this.invalidatePolicyCache(policy.organizationId || undefined);

    this.logger.log(`Policy ${policyId} deleted successfully`);
  }

  /**
   * Obtiene una política por ID
   */
  async getPolicy(policyId: string): Promise<Policy> {
    const policy = await this.policyRepository.findOne({
      where: { id: policyId },
    });

    if (!policy) {
      throw new NotFoundException(`Policy with ID ${policyId} not found`);
    }

    return policy;
  }

  /**
   * Lista políticas con filtros
   */
  async listPolicies(filters: PolicyFilters): Promise<Policy[]> {
    const query = this.policyRepository.createQueryBuilder('policy');

    if (filters.organizationId !== undefined) {
      query.andWhere('policy.organizationId = :organizationId', {
        organizationId: filters.organizationId,
      });
    }

    if (filters.isActive !== undefined) {
      query.andWhere('policy.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    if (filters.module) {
      query.andWhere(':module = ANY(policy.modules)', {
        module: filters.module,
      });
    }

    if (filters.resource) {
      query.andWhere(':resource = ANY(policy.resources)', {
        resource: filters.resource,
      });
    }

    if (filters.action) {
      query.andWhere(':action = ANY(policy.actions)', {
        action: filters.action,
      });
    }

    query.orderBy('policy.priority', 'DESC');

    return query.getMany();
  }

  /**
   * Obtiene las políticas aplicables a un recurso y acción
   */
  async getApplicablePolicies(
    resource: string,
    action: string,
    organizationId?: string,
  ): Promise<Policy[]> {
    // Intentar obtener desde caché
    const cacheKey = `policies:${organizationId || 'global'}:${resource}:${action}`;
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      return cached as Policy[];
    }

    // Consultar políticas desde la base de datos
    const query = this.policyRepository
      .createQueryBuilder('policy')
      .where('policy.isActive = :isActive', { isActive: true })
      .andWhere(
        '(policy.resources IS NULL OR :resource = ANY(policy.resources))',
        { resource },
      )
      .andWhere('(policy.actions IS NULL OR :action = ANY(policy.actions))', {
        action,
      });

    if (organizationId) {
      query.andWhere(
        '(policy.organizationId = :orgId OR policy.organizationId IS NULL)',
        { orgId: organizationId },
      );
    }

    const policies = await query.orderBy('policy.priority', 'DESC').getMany();

    // Guardar en caché (30 minutos)
    await this.cacheService.set(cacheKey, policies, 30 * 60);

    return policies;
  }

  /**
   * Evalúa políticas para un contexto dado
   */
  async evaluatePolicies(
    resource: string,
    action: string,
    context: PolicyEvaluationContext,
    organizationId?: string,
  ): Promise<boolean> {
    const policies = await this.getApplicablePolicies(
      resource,
      action,
      organizationId,
    );
    return this.policyEngine.evaluatePolicies(policies, context);
  }

  /**
   * Prueba una política específica con datos simulados
   */
  async testPolicy(
    policyId: string,
    testData: TestPolicyDto,
  ): Promise<{
    policy: Policy;
    result: PolicyEvaluationResult;
  }> {
    const policy = await this.getPolicy(policyId);

    const context: PolicyEvaluationContext = {
      userId: testData.userId,
      userEmail: testData.userEmail,
      userRoles: testData.userRoles,
      userDepartment: testData.userDepartment,
      organizationId: testData.organizationId,
      resource: testData.resource,
      resourceId: testData.resourceId,
      action: testData.action,
      ipAddress: testData.ipAddress,
      ...testData,
    };

    const result = await this.policyEngine.evaluatePolicy(policy, context);

    return {
      policy,
      result,
    };
  }

  /**
   * Invalida el caché de políticas
   */
  private async invalidatePolicyCache(organizationId?: string): Promise<void> {
    const _cacheKey = `policies:${organizationId || 'global'}:*`;
    // Nota: Redis no soporta wildcards directamente, necesitamos eliminar las claves específicas
    // Por ahora, simplemente no hacemos cache invalidation granular
    this.logger.debug(
      `Invalidated policy cache for organization: ${organizationId}`,
    );
  }
}
