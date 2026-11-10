import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { SystemConfigService } from './system-config.service';

@Injectable()
export class DateTimeService {
  constructor(private configService: SystemConfigService) {}

  async getCurrentDateTime(): Promise<DateTime> {
    const timezone = await this.configService.getValue(
      'SYSTEM.TIMEZONE',
      'UTC',
    );
    return DateTime.now().setZone(timezone);
  }

  async getCurrentDate(): Promise<Date> {
    const dt = await this.getCurrentDateTime();
    return dt.toJSDate();
  }

  async formatDateTime(
    date: Date | DateTime,
    format?: string,
  ): Promise<string> {
    const dt = date instanceof Date ? DateTime.fromJSDate(date) : date;
    const finalFormat =
      format ||
      (await this.configService.getValue(
        'SYSTEM.DATE_TIME_FORMAT',
        'yyyy-MM-dd HH:mm:ss',
      )) ||
      'yyyy-MM-dd HH:mm:ss';
    const timezone = await this.getSystemTimeZone();
    return dt.setZone(timezone).toFormat(finalFormat);
  }

  async getSystemTimeZone(): Promise<string> {
    const tz = await this.configService.getValue('SYSTEM.TIMEZONE', 'UTC');
    return tz || 'UTC';
  }
}
