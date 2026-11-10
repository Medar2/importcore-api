import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { FiscalDocument } from '../../entities/fiscal-document.entity';
import { ECF_PROVIDER } from '../ports/ecf-provider.port';
import type { ECfProvider } from '../ports/ecf-provider.port';
import { periodOrBadRequest } from './period-or-bad-request';

/** Consulta de comprobantes emitidos y refresco de estado ante el proveedor. */
@Injectable()
export class FiscalDocumentsService {
  constructor(
    @InjectRepository(FiscalDocument)
    private readonly documents: Repository<FiscalDocument>,
    @Inject(ECF_PROVIDER) private readonly provider: ECfProvider,
  ) {}

  list(filter: { period?: string; orderId?: string }): Promise<FiscalDocument[]> {
    const where: Record<string, unknown> = {};
    if (filter.period) {
      const p = periodOrBadRequest(filter.period);
      where.issueDate = Between(p.start, p.end);
    }
    if (filter.orderId) where.orderId = filter.orderId;
    return this.documents.find({ where, order: { issueDate: 'DESC', encf: 'DESC' } });
  }

  async findById(id: string): Promise<FiscalDocument> {
    const doc = await this.documents.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('Comprobante no encontrado');
    return doc;
  }

  /** Actualiza el estado de un e-CF en proceso consultando al proveedor. */
  async refreshStatus(id: string): Promise<FiscalDocument> {
    const doc = await this.findById(id);
    if (!doc.trackId || doc.status === 'CANCELLED') return doc;
    const result = await this.provider.getStatus(doc.trackId);
    doc.status = result.status;
    doc.providerMessage = result.message ?? doc.providerMessage;
    doc.securityCode = result.securityCode ?? doc.securityCode;
    return this.documents.save(doc);
  }
}
