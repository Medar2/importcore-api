import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { canTransitionQuote } from '../../domain/quote-status-transitions';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quote, QuoteStatus } from '../../entities/quote.entity';

/** Consultas y transiciones de estado de cotizaciones (M3). */
@Injectable()
export class QuoteQueriesService {
  constructor(
    @InjectRepository(Quote)
    private readonly quotes: Repository<Quote>,
  ) {}

  findAll(status?: QuoteStatus): Promise<Quote[]> {
    return this.quotes.find({
      where: status ? { status } : {},
      relations: ['customer', 'container'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Quote> {
    const quote = await this.quotes.findOne({
      where: { id },
      relations: ['customer', 'container'],
    });
    if (!quote) throw new NotFoundException('Cotizacion no encontrada');
    return quote;
  }

  async transition(id: string, status: QuoteStatus): Promise<Quote> {
    const quote = await this.findById(id);
    if (!canTransitionQuote(quote.status, status)) {
      throw new BadRequestException(
        `Transicion invalida ${quote.status} → ${status}. CONVERTED solo al crear un pedido.`,
      );
    }
    quote.status = status;
    return this.quotes.save(quote);
  }
}
