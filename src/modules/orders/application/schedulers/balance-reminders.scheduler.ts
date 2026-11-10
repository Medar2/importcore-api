import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SendBalanceRemindersUseCase } from '../use-cases/send-balance-reminders.use-case';

@Injectable()
export class BalanceRemindersScheduler {
  private readonly logger = new Logger(BalanceRemindersScheduler.name);

  constructor(private readonly reminders: SendBalanceRemindersUseCase) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM, { timeZone: 'America/Santo_Domingo' })
  async run(): Promise<void> {
    try {
      await this.reminders.execute();
    } catch (err) {
      this.logger.error(`Fallo en recordatorios de saldo: ${(err as Error).message}`);
    }
  }
}
