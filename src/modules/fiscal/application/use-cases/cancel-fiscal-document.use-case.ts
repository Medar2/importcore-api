import { BadGatewayException, BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FiscalDocument } from '../../entities/fiscal-document.entity';
import { FiscalDocumentsService } from '../services/fiscal-documents.service';
import { FiscalCompanyService } from '../services/fiscal-company.service';
import { AuditService } from '../../../audit/services/audit.service';
import { ECF_PROVIDER } from '../ports/ecf-provider.port';
import type { ECfProvider } from '../ports/ecf-provider.port';
import type { CancelFiscalDocumentDto } from '../../presentation/dtos/fiscal-document.dto';
import type { User } from '../../../security/entities/user.entity';

/** Anula un comprobante (alimenta el 608) y lo notifica al proveedor. */
@Injectable()
export class CancelFiscalDocumentUseCase {
  constructor(
    @InjectRepository(FiscalDocument)
    private readonly repo: Repository<FiscalDocument>,
    @Inject(ECF_PROVIDER) private readonly provider: ECfProvider,
    private readonly documents: FiscalDocumentsService,
    private readonly company: FiscalCompanyService,
    private readonly audit: AuditService,
  ) {}

  async execute(id: string, dto: CancelFiscalDocumentDto, user: User): Promise<FiscalDocument> {
    const doc = await this.documents.findById(id);
    if (doc.status === 'CANCELLED') throw new BadRequestException('El comprobante ya esta anulado');

    const issuer = await this.company.get();
    const result = await this.provider.cancel({
      issuerRnc: issuer.rnc,
      encf: doc.encf,
      ecfType: doc.ecfType,
      reason: dto.reason,
    });
    if (!result.ok) {
      throw new BadGatewayException(`El proveedor rechazo la anulacion: ${result.message ?? 'sin detalle'}`);
    }

    Object.assign(doc, {
      status: 'CANCELLED',
      cancellationType: dto.cancellationType,
      cancellationReason: dto.reason.trim(),
      cancelledAt: new Date(),
      providerMessage: result.message ?? doc.providerMessage,
    });
    const saved = await this.repo.save(doc);

    await this.audit.logAccess({
      userId: user.id,
      userEmail: user.person?.email ?? user.username,
      organizationId: user.organizationId ?? undefined,
      action: 'CANCEL_ECF',
      resource: 'FISCAL',
      resourceId: doc.id,
      result: 'success',
      reason: dto.reason,
      metadata: { encf: doc.encf, cancellationType: dto.cancellationType },
    });
    return saved;
  }
}
