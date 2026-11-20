import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../../security/entities/session.entity';
import { User } from '../../security/entities/user.entity';

export interface SessionAuditFilters {
  userId?: string;
  isActive?: boolean;
  closeReason?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface SessionAuditRow {
  id: string;
  userId: string;
  userEmail: string | null;
  username: string | null;
  deviceName: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  country: string | null;
  city: string | null;
  isActive: boolean;
  createdAt: Date;
  lastActivityAt: Date;
  closedAt: Date | null;
  closeReason: string | null;
  durationMs: number;
}

@Injectable()
export class SessionAuditService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  /**
   * Lista sesiones (activas e históricas) con datos del usuario.
   * durationMs = tiempo en sesión: createdAt -> closedAt, o now() si sigue activa.
   */
  async listSessions(filters: SessionAuditFilters): Promise<{
    data: SessionAuditRow[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(500, Math.max(1, filters.limit ?? 100));

    const qb = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.user', 'user')
      .leftJoinAndSelect('user.person', 'person')
      .leftJoinAndSelect('user.organization', 'organization')
      .orderBy('session.createdAt', 'DESC');

    if (filters.userId) {
      qb.andWhere('session.userId = :userId', { userId: filters.userId });
    }
    if (filters.isActive !== undefined) {
      qb.andWhere('session.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }
    if (filters.closeReason) {
      qb.andWhere('session.closeReason = :closeReason', {
        closeReason: filters.closeReason,
      });
    }
    if (filters.startDate) {
      qb.andWhere('session.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }
    if (filters.endDate) {
      qb.andWhere('session.createdAt <= :endDate', { endDate: filters.endDate });
    }

    qb.skip((page - 1) * limit).take(limit);

    const [sessions, total] = await qb.getManyAndCount();

    return {
      data: sessions.map((s) => this.toRow(s)),
      total,
      page,
      limit,
    };
  }

  /**
   * Historial de sesiones de un usuario específico.
   */
  async getUserSessions(
    userId: string,
    filters: Pick<SessionAuditFilters, 'startDate' | 'endDate'> = {},
  ): Promise<SessionAuditRow[]> {
    const qb = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.user', 'user')
      .leftJoinAndSelect('user.person', 'person')
      .where('session.userId = :userId', { userId })
      .orderBy('session.createdAt', 'DESC')
      .limit(500);

    if (filters.startDate) {
      qb.andWhere('session.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }
    if (filters.endDate) {
      qb.andWhere('session.createdAt <= :endDate', { endDate: filters.endDate });
    }

    const sessions = await qb.getMany();
    return sessions.map((s) => this.toRow(s));
  }

  /**
   * Resumen de tiempo en sesión por usuario en un rango de fechas.
   */
  async getSummary(filters: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<
    {
      userId: string;
      userEmail: string | null;
      username: string | null;
      totalSessions: number;
      activeSessions: number;
      totalDurationMs: number;
    }[]
  > {
    const qb = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoin('session.user', 'user')
      .leftJoin('user.person', 'person')
      .select('session.userId', 'userId')
      .addSelect('MAX(person.email)', 'userEmail')
      .addSelect('MAX(user.username)', 'username')
      .addSelect('COUNT(session.id)', 'totalSessions')
      .addSelect('SUM(CASE WHEN session.isActive THEN 1 ELSE 0 END)', 'activeSessions')
      .addSelect(
        `SUM(EXTRACT(EPOCH FROM (COALESCE(session.closed_at, CASE WHEN session.is_active THEN now() ELSE session.last_activity_at END) - session.created_at)) * 1000)`,
        'totalDurationMs',
      )
      .groupBy('session.userId')
      .orderBy('"totalDurationMs"', 'DESC');

    if (filters.startDate) {
      qb.andWhere('session.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }
    if (filters.endDate) {
      qb.andWhere('session.createdAt <= :endDate', { endDate: filters.endDate });
    }

    const rows = await qb.getRawMany<{
      userId: string;
      userEmail: string | null;
      username: string | null;
      totalSessions: string;
      activeSessions: string;
      totalDurationMs: string | null;
    }>();

    return rows.map((r) => ({
      userId: r.userId,
      userEmail: r.userEmail,
      username: r.username,
      totalSessions: Number(r.totalSessions),
      activeSessions: Number(r.activeSessions),
      totalDurationMs: Math.round(Number(r.totalDurationMs ?? 0)),
    }));
  }

  private toRow(session: Session & { user?: User }): SessionAuditRow {
    const end = session.closedAt ?? (session.isActive ? new Date() : session.lastActivityAt);
    const durationMs = Math.max(
      0,
      (end instanceof Date ? end.getTime() : new Date(end).getTime()) -
        new Date(session.createdAt).getTime(),
    );

    return {
      id: session.id,
      userId: session.userId,
      userEmail: session.user?.person?.email ?? null,
      username: session.user?.username ?? null,
      deviceName: session.deviceName,
      deviceType: session.deviceType,
      browser: session.browser,
      os: session.os,
      ipAddress: session.ipAddress,
      country: session.country,
      city: session.city,
      isActive: session.isActive,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
      closedAt: session.closedAt,
      closeReason: session.closeReason,
      durationMs,
    };
  }
}
