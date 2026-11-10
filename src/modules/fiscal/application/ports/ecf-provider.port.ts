import type { ECfType } from '../../domain/dgii-catalogs';

/** Token de inyección del adaptador e-CF activo. */
export const ECF_PROVIDER = Symbol('ECF_PROVIDER');

export interface ECfLine {
  description: string;
  quantity: string;
  unitPriceDop: string;
  itbisRate: string;
}

export interface ECfEmissionRequest {
  encf: string;
  ecfType: ECfType;
  issueDate: string;
  issuer: { rnc: string; name: string };
  buyer: { taxId: string | null; name: string };
  subtotalDop: string;
  itbisDop: string;
  totalDop: string;
  exchangeRate: string;
  totalUsd: string;
  lines: ECfLine[];
  /** e-NCF afectado (notas de crédito/débito). */
  modifiedEncf?: string | null;
}

export type ECfStatus = 'ACCEPTED' | 'CONDITIONAL' | 'REJECTED' | 'IN_PROCESS';

export interface ECfEmissionResult {
  status: ECfStatus;
  trackId: string | null;
  /** Código de seguridad para la representación impresa / QR. */
  securityCode: string | null;
  message: string | null;
  raw?: unknown;
}

export interface ECfCancellationRequest {
  issuerRnc: string;
  encf: string;
  ecfType: ECfType;
  reason: string;
}

/**
 * Contrato con proveedores certificados de e-CF o con la DGII directa.
 * Cada proveedor (Alanube, Voxel, Megasoft…) se implementa como adaptador.
 */
export interface ECfProvider {
  readonly name: string;
  emit(req: ECfEmissionRequest): Promise<ECfEmissionResult>;
  getStatus(trackId: string): Promise<ECfEmissionResult>;
  cancel(req: ECfCancellationRequest): Promise<{ ok: boolean; message: string | null }>;
}
