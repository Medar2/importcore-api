import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalculateQuoteCostUseCase } from './calculate-quote-cost.use-case';
import { CalculateQuoteRequestDto } from '../../presentation/dtos/calculate-landed-cost-request.dto';
import { Quote } from '../../entities/quote.entity';
import { ShipmentContainer } from '../../../shipping/entities/shipment-container.entity';
import { Customer } from '../../../customers/entities/customer.entity';

export interface CreateQuoteInput extends CalculateQuoteRequestDto {
  customerName?: string;
  customerId?: string;
  containerId?: string;
  validDays?: number;
}

/**
 * Persiste una cotizacion: ejecuta el calculo stateless y guarda
 * snapshot + resultado para trazabilidad (M3, ciclo draft->sent->accepted).
 */
@Injectable()
export class CreateQuoteUseCase {
  constructor(
    private readonly calculate: CalculateQuoteCostUseCase,
    @InjectRepository(Quote)
    private readonly quotes: Repository<Quote>,
    @InjectRepository(ShipmentContainer)
    private readonly containers: Repository<ShipmentContainer>,
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
  ) {}

  async execute(input: CreateQuoteInput): Promise<Quote> {
    const { customerName, customerId, validDays, containerId, ...calcInput } =
      input;
    const result = this.calculate.execute(calcInput);

    let customer: Customer | null = null;
    if (customerId) {
      customer = await this.customers.findOne({ where: { id: customerId } });
      if (!customer) throw new NotFoundException('Cliente no encontrado');
    }

    let container: ShipmentContainer | null = null;
    if (containerId) {
      container = await this.containers.findOne({ where: { id: containerId } });
      if (!container) throw new NotFoundException('Contenedor no encontrado');
      if (!['PLANNED', 'LOADED'].includes(container.status)) {
        throw new BadRequestException(
          'El contenedor no admite mas carga en su estado actual',
        );
      }
    }

    const quote = this.quotes.create({
      quoteNumber: this.nextQuoteNumber(),
      customerName: customer?.name ?? customerName ?? null,
      customerId: customer?.id ?? null,
      status: 'DRAFT',
      currency: result.currency,
      requestSnapshot: calcInput,
      calculationResult: result,
      landedCostUsd: result.totals.landedCostUsd,
      customerPriceUsd: result.totals.customerPriceUsd ?? null,
      validUntil: validDays
        ? new Date(Date.now() + validDays * 86400000)
            .toISOString()
            .slice(0, 10)
        : null,
      containerId: container?.id ?? null,
    });
    return this.quotes.save(quote);
  }

  /** QT-YYYYMMDD-XXXX secuencial por dia. */
  private nextQuoteNumber(): string {
    const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `QT-${d}-${rand}`;
  }
}
