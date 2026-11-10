import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SessionService } from '../services/session.service';

/** Cierra a diario las sesiones cuyo refresh token (7 días) ya venció. */
@Injectable()
export class ExpiredSessionsScheduler {
  private readonly logger = new Logger(ExpiredSessionsScheduler.name);

  constructor(private readonly sessions: SessionService) {}

  @Cron('0 3 * * *', { timeZone: 'America/Santo_Domingo' })
  async run(): Promise<void> {
    const closed = await this.sessions.expireSessions();
    if (closed > 0) this.logger.log(`${closed} sesión(es) vencida(s) cerrada(s)`);
  }
}
