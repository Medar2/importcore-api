import { Module } from '@nestjs/common';
import { IsCedulaDominicanaConstraint } from './validators/cedula.validator';
import {
  IsAfpNumberConstraint,
  IsArsNumberConstraint,
  IsNssConstraint,
} from './validators/afp-ars.validator';

/**
 * Módulo compartido de utilitarios de nómina.
 * Exporta validadores, constantes y tipos reutilizables
 * por todos los módulos del dominio payroll.
 */
@Module({
  providers: [
    IsCedulaDominicanaConstraint,
    IsAfpNumberConstraint,
    IsArsNumberConstraint,
    IsNssConstraint,
  ],
  exports: [
    IsCedulaDominicanaConstraint,
    IsAfpNumberConstraint,
    IsArsNumberConstraint,
    IsNssConstraint,
  ],
})
export class PayrollCommonModule {}
