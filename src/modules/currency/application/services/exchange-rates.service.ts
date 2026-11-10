import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Decimal } from 'decimal.js';
import { ExchangeRate } from '../../entities/exchange-rate.entity';
import { UpsertExchangeRateDto } from '../../presentation/dtos/exchange-rate.dto';

/**
 * Tasas de cambio con trazabilidad historica (BR-004).
 * Upsert por (base, quote, effective_date).
 */
@Injectable()
export class ExchangeRatesService {
  constructor(
    @InjectRepository(ExchangeRate)
    private readonly repo: Repository<ExchangeRate>,
  ) {}

  async upsert(dto: UpsertExchangeRateDto): Promise<ExchangeRate> {
    const rate = new Decimal(dto.rate);
    if (!rate.isFinite() || rate.lte(0)) {
      throw new Error('La tasa de cambio debe ser un numero positivo');
    }

    const existing = await this.repo.findOne({
      where: {
        baseCurrency: dto.baseCurrency,
        quoteCurrency: dto.quoteCurrency,
        effectiveDate: dto.effectiveDate,
      },
    });

    if (existing) {
      existing.rate = dto.rate;
      existing.source = dto.source ?? existing.source;
      return this.repo.save(existing);
    }

    return this.repo.save(
      this.repo.create({
        baseCurrency: dto.baseCurrency,
        quoteCurrency: dto.quoteCurrency,
        rate: dto.rate,
        effectiveDate: dto.effectiveDate,
        source: dto.source ?? 'MANUAL',
      } as Partial<ExchangeRate>),
    );
  }

  async findLatest(
    base: string,
    quote: string,
    onOrBefore?: string,
  ): Promise<ExchangeRate | null> {
    const qb = this.repo
      .createQueryBuilder('er')
      .where('er.base_currency = :base', { base })
      .andWhere('er.quote_currency = :quote', { quote })
      .orderBy('er.effective_date', 'DESC')
      .limit(1);
    if (onOrBefore) {
      qb.andWhere('er.effective_date <= :date', { date: onOrBefore });
    }
    return qb.getOne();
  }

  findAll(): Promise<ExchangeRate[]> {
    return this.repo.find({ order: { effectiveDate: 'DESC' } });
  }
}
