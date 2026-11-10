import { IsDateString, IsIn, IsNumberString, IsOptional } from 'class-validator';
import { ECF_TYPES } from '../../domain/dgii-catalogs';
import type { ECfType } from '../../domain/dgii-catalogs';

/** Registra un rango autorizado por la DGII (reemplaza el activo del tipo). */
export class CreateNcfSequenceDto {
  @IsIn(Object.keys(ECF_TYPES))
  ecfType: ECfType;

  /** Primer secuencial autorizado (ej. 1). */
  @IsNumberString({ no_symbols: true })
  startNumber: string;

  /** Último secuencial autorizado (máx. 10 dígitos). */
  @IsNumberString({ no_symbols: true })
  endNumber: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
