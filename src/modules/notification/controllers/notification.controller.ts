import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  NotificationService,
  NotificationFilters,
} from '../services/notification.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * GET /notifications
   * Lista notificaciones del usuario actual
   */
  @Get()
  async getNotifications(
    @Req() req: any,
    @Query('isRead') isRead?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters: NotificationFilters = {
      userId: req.user.id,
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
      type,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    };

    const result = await this.notificationService.getNotifications(
      req.user.id,
      filters,
    );

    return {
      success: true,
      data: result.notifications,
      total: result.total,
    };
  }

  /**
   * GET /notifications/unread-count
   * Obtiene el conteo de notificaciones no leídas
   */
  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const count = await this.notificationService.getUnreadCount(req.user.id);

    return {
      success: true,
      data: { count },
    };
  }

  /**
   * PUT /notifications/:id/read
   * Marca una notificación como leída
   */
  @Put(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const notification = await this.notificationService.markAsRead(
      id,
      req.user.id,
    );

    return {
      success: true,
      data: notification,
    };
  }

  /**
   * PUT /notifications/read-all
   * Marca todas las notificaciones como leídas
   */
  @Put('read-all')
  async markAllAsRead(@Req() req: any) {
    const count = await this.notificationService.markAllAsRead(req.user.id);

    return {
      success: true,
      data: { markedAsRead: count },
    };
  }

  /**
   * DELETE /notifications/cleanup
   * Elimina notificaciones antiguas (admin)
   */
  @Delete('cleanup')
  async cleanupOldNotifications(@Query('days') days?: string) {
    const daysOld = days ? parseInt(days, 10) : 90;
    const deleted =
      await this.notificationService.cleanupOldNotifications(daysOld);

    return {
      success: true,
      data: { deleted },
    };
  }
}
