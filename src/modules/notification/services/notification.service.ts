import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecurityNotification } from '../entities/security-notification.entity';
import { User } from '../../security/entities/user.entity';
import { EmailService } from './email.service';

export interface CreateNotificationDto {
  userId: string;
  type:
    | 'new_device'
    | 'failed_login'
    | 'permission_change'
    | 'delegation_created'
    | 'mfa_disabled';
  title: string;
  message: string;
  metadata?: any;
  sendEmail?: boolean;
}

export interface NotificationFilters {
  userId?: string;
  isRead?: boolean;
  type?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(SecurityNotification)
    private readonly notificationRepository: Repository<SecurityNotification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Crea una nueva notificación de seguridad
   */
  async createNotification(
    createNotificationDto: CreateNotificationDto,
  ): Promise<SecurityNotification> {
    this.logger.log(
      `Creating notification for user ${createNotificationDto.userId}: ${createNotificationDto.title}`,
    );

    const notification = this.notificationRepository.create({
      userId: createNotificationDto.userId,
      type: createNotificationDto.type,
      title: createNotificationDto.title,
      message: createNotificationDto.message,
      metadata: createNotificationDto.metadata,
      isRead: false,
    });

    const savedNotification =
      await this.notificationRepository.save(notification);

    // Enviar email si se solicita
    if (createNotificationDto.sendEmail) {
      await this.sendEmailNotification(savedNotification.id);
    }

    this.logger.log(
      `Notification ${savedNotification.id} created successfully`,
    );
    return savedNotification;
  }

  /**
   * Notifica sobre un nuevo dispositivo
   */
  async notifyNewDevice(
    userId: string,
    deviceInfo: { browser: string; os: string; ip: string },
  ): Promise<SecurityNotification> {
    return this.createNotification({
      userId,
      type: 'new_device',
      title: 'Nuevo dispositivo detectado',
      message: `Se ha iniciado sesión desde un nuevo ${deviceInfo.browser} en ${deviceInfo.os} (IP: ${deviceInfo.ip})`,
      metadata: deviceInfo,
      sendEmail: true,
    });
  }

  /**
   * Notifica sobre intento de login fallido
   */
  async notifyFailedLogin(
    userId: string,
    attemptInfo: { ip: string; browser: string; attempts: number },
  ): Promise<SecurityNotification> {
    return this.createNotification({
      userId,
      type: 'failed_login',
      title: 'Intento de login fallido',
      message: `Se detectaron ${attemptInfo.attempts} intentos de login fallidos desde IP: ${attemptInfo.ip}`,
      metadata: attemptInfo,
      sendEmail: attemptInfo.attempts >= 3,
    });
  }

  /**
   * Notifica sobre cambio de permisos
   */
  async notifyPermissionChange(
    userId: string,
    changeInfo: {
      changedBy: string;
      permission: string;
      action: 'granted' | 'revoked';
    },
  ): Promise<SecurityNotification> {
    return this.createNotification({
      userId,
      type: 'permission_change',
      title: 'Cambio de permisos',
      message: `Permiso '${changeInfo.permission}' ha sido ${changeInfo.action === 'granted' ? 'concedido' : 'revocado'} por ${changeInfo.changedBy}`,
      metadata: changeInfo,
      sendEmail: true,
    });
  }

  /**
   * Notifica sobre nueva delegación
   */
  async notifyDelegationCreated(
    userId: string,
    delegationInfo: {
      delegatedBy: string;
      permission: string;
      expiresAt: Date;
    },
  ): Promise<SecurityNotification> {
    return this.createNotification({
      userId,
      type: 'delegation_created',
      title: 'Nueva delegación de permisos',
      message: `${delegationInfo.delegatedBy} le ha delegado el permiso '${delegationInfo.permission}'. Expira: ${delegationInfo.expiresAt.toLocaleDateString()}`,
      metadata: delegationInfo,
      sendEmail: true,
    });
  }

  /**
   * Notifica sobre MFA deshabilitado
   */
  async notifyMfaDisabled(
    userId: string,
    disabledBy: string,
  ): Promise<SecurityNotification> {
    return this.createNotification({
      userId,
      type: 'mfa_disabled',
      title: 'MFA deshabilitado',
      message: `La autenticación de dos factores ha sido deshabilitada por ${disabledBy}`,
      metadata: { disabledBy },
      sendEmail: true,
    });
  }

  /**
   * Obtiene notificaciones de un usuario
   */
  async getNotifications(
    userId: string,
    filters: NotificationFilters,
  ): Promise<{ notifications: SecurityNotification[]; total: number }> {
    const { limit = 20, offset = 0, isRead, type } = filters;

    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId });

    if (isRead !== undefined) {
      query.andWhere('notification.isRead = :isRead', { isRead });
    }

    if (type) {
      query.andWhere('notification.type = :type', { type });
    }

    const [notifications, total] = await query
      .orderBy('notification.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { notifications, total };
  }

  /**
   * Marca una notificación como leída
   */
  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<SecurityNotification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification ${notificationId} not found`);
    }

    notification.isRead = true;
    notification.readAt = new Date();

    return this.notificationRepository.save(notification);
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );

    this.logger.log(
      `Marked ${result.affected} notifications as read for user ${userId}`,
    );
    return result.affected || 0;
  }

  /**
   * Obtiene el conteo de notificaciones no leídas
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Envía notificación por email
   */
  private async sendEmailNotification(notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
      relations: ['user', 'user.person'],
    });

    if (!notification || !notification.user || !notification.user.person) {
      this.logger.warn(`Notification ${notificationId} or user not found`);
      return;
    }

    try {
      await this.emailService.sendSecurityNotification(
        notification.user.person.email,
        notification.title,
        notification.message,
      );

      notification.emailSent = true;
      notification.emailSentAt = new Date();
      await this.notificationRepository.save(notification);

      this.logger.log(`Email sent for notification ${notificationId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email for notification ${notificationId}: ${error.message}`,
      );
    }
  }

  /**
   * Elimina notificaciones antiguas
   */
  async cleanupOldNotifications(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.notificationRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .andWhere('isRead = :isRead', { isRead: true })
      .execute();

    this.logger.log(`Deleted ${result.affected} old notifications`);
    return result.affected || 0;
  }
}
