import { createHash, randomUUID } from 'crypto';
import { Logger } from '@nestjs/common';
import type {
  ECfCancellationRequest,
  ECfEmissionRequest,
  ECfEmissionResult,
  ECfProvider,
} from '../../application/ports/ecf-provider.port';

/**
 * Adaptador simulado para desarrollo y pruebas: acepta todo comprobante
 * bien formado sin contactar a ningún proveedor ni a la DGII.
 */
export class MockECfProvider implements ECfProvider {
  readonly name = 'mock';
  private readonly logger = new Logger(MockECfProvider.name);

  emit(req: ECfEmissionRequest): Promise<ECfEmissionResult> {
    this.logger.warn(`[SIMULADO] e-CF ${req.encf} no se envió a la DGII`);
    return Promise.resolve({
      status: 'ACCEPTED',
      trackId: `MOCK-${randomUUID()}`,
      securityCode: createHash('sha256').update(req.encf).digest('hex').slice(0, 6).toUpperCase(),
      message: 'Aceptado (simulado, sin validez fiscal)',
    });
  }

  getStatus(trackId: string): Promise<ECfEmissionResult> {
    return Promise.resolve({
      status: 'ACCEPTED',
      trackId,
      securityCode: null,
      message: 'Aceptado (simulado)',
    });
  }

  cancel(req: ECfCancellationRequest): Promise<{ ok: boolean; message: string | null }> {
    this.logger.warn(`[SIMULADO] anulación de ${req.encf} no se envió a la DGII`);
    return Promise.resolve({ ok: true, message: 'Anulado (simulado)' });
  }
}
