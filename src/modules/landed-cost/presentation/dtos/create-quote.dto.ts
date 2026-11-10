import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { CalculateQuoteRequestDto } from './calculate-landed-cost-request.dto';

export class CreateQuoteDto extends CalculateQuoteRequestDto {
  @IsOptional()
  @IsString()
  customerName?: string;

  /** Contenedor existente para consolidar carga (si aplica). */
  @IsOptional()
  @IsUUID()
  containerId?: string;

  /** Cliente registrado; si se indica tiene prioridad sobre customerName. */
  @IsOptional()
  @IsUUID()
  customerId?: string;

  /** Dias de validez de la cotizacion (default: sin vencimiento). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  validDays?: number;
}
