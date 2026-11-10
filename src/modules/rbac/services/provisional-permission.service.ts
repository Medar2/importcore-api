import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { User } from '../../security/entities/user.entity';
import { Permission } from '../../security/entities/permission.entity';
import { UserPermission } from '../../security/entities/user-permission.entity';
import { CacheService } from '../../cache/cache.service';
import { AuditService } from '../../audit/services/audit.service';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ProvisionalPermissionConditions {
  resourceIds?: string[];
  timeRestriction?: {
    startHour: number;
    endHour: number;
    daysOfWeek?: number[];
  };
  ipWhitelist?: string[];
}

export interface CreateProvisionalPermissionDto {
  permissionCode: string;
  justification: string;
  requiresApproval?: boolean;
  conditions?: ProvisionalPermissionConditions;
  reviewPeriodDays?: number;
  expiresAt?: Date;
}

export interface ApproveProvisionalPermissionDto {
  approverId: string;
  conditions?: ProvisionalPermissionConditions;
}

export interface RejectProvisionalPermissionDto {
  approverId: string;
  reason: string;
}

export interface ReviewProvisionalPermissionDto {
  reviewerId: string;
  decision: 'continue' | 'revoke';
  notes?: string;
}

@Injectable()
export class ProvisionalPermissionService {
  private readonly logger = new Logger(ProvisionalPermissionService.name);
  private readonly MIN_JUSTIFICATION_LENGTH = 10;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(UserPermission)
    private readonly userPermissionRepository: Repository<UserPermission>,
    private readonly cacheService: CacheService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Crea un permiso provisional
   */
  async createProvisionalPermission(
    userId: string,
    dto: CreateProvisionalPermissionDto,
  ): Promise<UserPermission> {
    this.logger.log(
      `Creating provisional permission for user ${userId}: ${dto.permissionCode}`,
    );

    // Validar justificación
    if (
      !dto.justification ||
      dto.justification.length < this.MIN_JUSTIFICATION_LENGTH
    ) {
      throw new BadRequestException(
        `Justification must be at least ${this.MIN_JUSTIFICATION_LENGTH} characters`,
      );
    }

    // Verificar que el usuario existe
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Verificar que el permiso existe
    const permission = await this.permissionRepository.findOne({
      where: { code: dto.permissionCode },
    });
    if (!permission) {
      throw new NotFoundException(
        `Permission with code ${dto.permissionCode} not found`,
      );
    }

    // Determinar estado inicial
    const requiresApproval = dto.requiresApproval !== false;
    const approvalStatus: ApprovalStatus = requiresApproval
      ? 'pending'
      : 'approved';

    // Calcular fechas
    const now = new Date();
    const expiresAt =
      dto.expiresAt || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 días por defecto
    const reviewPeriodDays = dto.reviewPeriodDays || 30;
    const nextReviewAt = new Date(
      now.getTime() + reviewPeriodDays * 24 * 60 * 60 * 1000,
    );

    // Crear el permiso provisional
    const provisionalPermission = this.userPermissionRepository.create({
      userId,
      permissionId: permission.id,
      type: 'provisional',
      context: {
        justification: dto.justification,
        approvalStatus,
        conditions: dto.conditions,
        reviewPeriodDays,
        lastReviewedAt: null,
        nextReviewAt,
      },
      startsAt: now,
      expiresAt,
    });

    const savedPermission = await this.userPermissionRepository.save(
      provisionalPermission,
    );

    // Log de creación
    await this.auditService.logPermissionChange({
      userId: user.id,
      userEmail: user.username,
      organizationId: user.organizationId || undefined,
      action: 'PERMISSION_GRANTED',
      resource: 'PROVISIONAL_PERMISSION',
      resourceId: savedPermission.id,
      metadata: {
        permissionCode: dto.permissionCode,
        approvalStatus,
        requiresApproval,
        justification: dto.justification,
      },
    });

    this.logger.log(
      `Provisional permission ${savedPermission.id} created with status: ${approvalStatus}`,
    );

    return savedPermission;
  }

  /**
   * Aprueba un permiso provisional
   */
  async approveProvisionalPermission(
    permissionId: string,
    dto: ApproveProvisionalPermissionDto,
  ): Promise<UserPermission> {
    this.logger.log(`Approving provisional permission: ${permissionId}`);

    const permission = await this.userPermissionRepository.findOne({
      where: { id: permissionId },
      relations: ['permission', 'user'],
    });

    if (!permission) {
      throw new NotFoundException(
        `Permission with ID ${permissionId} not found`,
      );
    }

    if (permission.type !== 'provisional') {
      throw new BadRequestException(
        `Permission ${permissionId} is not provisional`,
      );
    }

    const context = permission.context as any;
    if (context.approvalStatus !== 'pending') {
      throw new BadRequestException(
        `Permission is already ${context.approvalStatus}`,
      );
    }

    // Aprobar el permiso
    context.approvalStatus = 'approved';
    context.approvedBy = dto.approverId;
    context.approvedAt = new Date();

    // Actualizar condiciones si se proporcionan
    if (dto.conditions) {
      context.conditions = { ...context.conditions, ...dto.conditions };
    }

    permission.context = context;
    const savedPermission =
      await this.userPermissionRepository.save(permission);

    // Invalidar caché
    await this.cacheService.invalidateUserCache(permission.userId);

    // Log de aprobación
    const approver = await this.userRepository.findOne({
      where: { id: dto.approverId },
    });
    if (approver) {
      await this.auditService.logPermissionChange({
        userId: permission.userId,
        userEmail: (permission.user as any)?.username,
        organizationId: (permission.user as any)?.organizationId || undefined,
        action: 'PERMISSION_GRANTED',
        resource: 'PROVISIONAL_PERMISSION',
        resourceId: permissionId,
        metadata: {
          permissionCode: (permission.permission as any)?.code,
          approvalStatus: 'approved',
          approvedBy: dto.approverId,
          approverEmail: approver.username,
        },
      });
    }

    this.logger.log(`Provisional permission ${permissionId} approved`);

    return savedPermission;
  }

  /**
   * Rechaza un permiso provisional
   */
  async rejectProvisionalPermission(
    permissionId: string,
    dto: RejectProvisionalPermissionDto,
  ): Promise<void> {
    this.logger.log(`Rejecting provisional permission: ${permissionId}`);

    const permission = await this.userPermissionRepository.findOne({
      where: { id: permissionId },
      relations: ['permission', 'user'],
    });

    if (!permission) {
      throw new NotFoundException(
        `Permission with ID ${permissionId} not found`,
      );
    }

    if (permission.type !== 'provisional') {
      throw new BadRequestException(
        `Permission ${permissionId} is not provisional`,
      );
    }

    const context = permission.context as any;
    if (context.approvalStatus !== 'pending') {
      throw new BadRequestException(
        `Permission is already ${context.approvalStatus}`,
      );
    }

    // Rechazar el permiso
    context.approvalStatus = 'rejected';
    context.approvedBy = dto.approverId;
    context.approvedAt = new Date();
    context.rejectionReason = dto.reason;

    permission.context = context;
    await this.userPermissionRepository.save(permission);

    // Log de rechazo
    const approver = await this.userRepository.findOne({
      where: { id: dto.approverId },
    });
    if (approver) {
      await this.auditService.logPermissionChange({
        userId: permission.userId,
        userEmail: (permission.user as any)?.username,
        organizationId: (permission.user as any)?.organizationId || undefined,
        action: 'PERMISSION_REVOKED',
        resource: 'PROVISIONAL_PERMISSION',
        resourceId: permissionId,
        metadata: {
          permissionCode: (permission.permission as any)?.code,
          approvalStatus: 'rejected',
          rejectionReason: dto.reason,
          rejectedBy: dto.approverId,
        },
      });
    }

    this.logger.log(`Provisional permission ${permissionId} rejected`);
  }

  /**
   * Lista permisos pendientes de aprobación
   */
  async listPendingApprovals(_approverId?: string): Promise<UserPermission[]> {
    const query = this.userPermissionRepository
      .createQueryBuilder('up')
      .innerJoin('up.permission', 'permission')
      .innerJoin('up.user', 'user')
      .where('up.type = :type', { type: 'provisional' })
      .andWhere("up.context->>'approvalStatus' = :status", {
        status: 'pending',
      })
      .andWhere('up.expiresAt > :now', { now: new Date() });

    return query.getMany();
  }

  /**
   * Lista permisos provisionales del usuario
   */
  async getUserProvisionalPermissions(
    userId: string,
  ): Promise<UserPermission[]> {
    return this.userPermissionRepository.find({
      where: {
        userId,
        type: 'provisional',
      },
      relations: ['permission'],
    });
  }

  /**
   * Revisa un permiso provisional
   */
  async reviewProvisionalPermission(
    permissionId: string,
    dto: ReviewProvisionalPermissionDto,
  ): Promise<UserPermission> {
    this.logger.log(`Reviewing provisional permission: ${permissionId}`);

    const permission = await this.userPermissionRepository.findOne({
      where: { id: permissionId },
      relations: ['permission', 'user'],
    });

    if (!permission) {
      throw new NotFoundException(
        `Permission with ID ${permissionId} not found`,
      );
    }

    const context = permission.context as any;
    const now = new Date();

    // Actualizar fecha de revisión
    context.lastReviewedAt = now;

    // Calcular próxima revisión
    if (dto.decision === 'continue' && context.reviewPeriodDays) {
      context.nextReviewAt = new Date(
        now.getTime() + context.reviewPeriodDays * 24 * 60 * 60 * 1000,
      );
    } else if (dto.decision === 'revoke') {
      // Revocar el permiso
      context.approvalStatus = 'rejected';
      context.revokedAt = now;
      context.revocationReason = dto.notes || 'Revoked during review';
      permission.expiresAt = now;
    }

    permission.context = context;
    const savedPermission =
      await this.userPermissionRepository.save(permission);

    // Invalidar caché si se revocó
    if (dto.decision === 'revoke') {
      await this.cacheService.invalidateUserCache(permission.userId);
    }

    this.logger.log(
      `Provisional permission ${permissionId} reviewed: ${dto.decision}`,
    );

    return savedPermission;
  }

  /**
   * Revoca un permiso provisional
   */
  async revokeProvisionalPermission(
    permissionId: string,
    reason: string,
  ): Promise<void> {
    this.logger.log(`Revoking provisional permission: ${permissionId}`);

    const permission = await this.userPermissionRepository.findOne({
      where: { id: permissionId },
      relations: ['permission', 'user'],
    });

    if (!permission) {
      throw new NotFoundException(
        `Permission with ID ${permissionId} not found`,
      );
    }

    if (permission.type !== 'provisional') {
      throw new BadRequestException(
        `Permission ${permissionId} is not provisional`,
      );
    }

    const context = permission.context as any;
    context.approvalStatus = 'rejected';
    context.revokedAt = new Date();
    context.revocationReason = reason;

    permission.context = context;
    permission.expiresAt = new Date();

    await this.userPermissionRepository.save(permission);

    // Invalidar caché
    await this.cacheService.invalidateUserCache(permission.userId);

    // Log de revocación
    await this.auditService.logPermissionChange({
      userId: permission.userId,
      userEmail: (permission.user as any)?.username,
      organizationId: (permission.user as any)?.organizationId || undefined,
      action: 'PERMISSION_REVOKED',
      resource: 'PROVISIONAL_PERMISSION',
      resourceId: permissionId,
      metadata: {
        permissionCode: (permission.permission as any)?.code,
        revocationReason: reason,
      },
    });

    this.logger.log(`Provisional permission ${permissionId} revoked`);
  }

  /**
   * Verifica las condiciones de un permiso provisional
   */
  checkProvisionalConditions(
    permission: UserPermission,
    context: {
      resourceId?: string;
      ipAddress?: string;
      time?: { hour: number; minute: number; dayOfWeek: number };
    },
  ): boolean {
    const permissionContext = permission.context as any;

    if (!permissionContext.conditions) {
      return true;
    }

    const conditions =
      permissionContext.conditions as ProvisionalPermissionConditions;

    // Verificar resourceIds
    if (conditions.resourceIds && conditions.resourceIds.length > 0) {
      if (
        !context.resourceId ||
        !conditions.resourceIds.includes(context.resourceId)
      ) {
        return false;
      }
    }

    // Verificar timeRestriction
    if (conditions.timeRestriction) {
      const now = context.time || {
        hour: new Date().getHours(),
        minute: new Date().getMinutes(),
        dayOfWeek: new Date().getDay(),
      };

      const { startHour, endHour, daysOfWeek } = conditions.timeRestriction;

      // Verificar día de la semana
      if (daysOfWeek && daysOfWeek.length > 0) {
        if (!daysOfWeek.includes(now.dayOfWeek)) {
          return false;
        }
      }

      // Verificar hora
      if (now.hour < startHour || now.hour > endHour) {
        return false;
      }
    }

    // Verificar ipWhitelist
    if (conditions.ipWhitelist && conditions.ipWhitelist.length > 0) {
      if (
        !context.ipAddress ||
        !conditions.ipWhitelist.includes(context.ipAddress)
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Cron job para notificar revisiones pendientes
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async notifyPendingReviews(): Promise<void> {
    this.logger.log('Checking for pending provisional permission reviews...');

    const now = new Date();
    const permissionsToReview = await this.userPermissionRepository.find({
      where: {
        type: 'provisional',
        expiresAt: MoreThan(now),
      },
    });

    for (const permission of permissionsToReview) {
      const context = permission.context as any;
      if (context.nextReviewAt && new Date(context.nextReviewAt) <= now) {
        // Aquí se podría enviar una notificación
        this.logger.log(`Provisional permission ${permission.id} needs review`);
      }
    }
  }
}
