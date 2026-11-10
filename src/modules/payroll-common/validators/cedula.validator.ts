import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  CEDULA_LENGTH,
  CEDULA_REGEX,
} from '../constants/dominican-laws.constants';

/**
 * Valida el formato y dígito verificador de una cédula de identidad dominicana.
 *
 * Algoritmo Luhn adaptado usado por la JCE (Junta Central Electoral).
 * Formato: ###-#######-# (11 dígitos, los guiones son opcionales).
 */
export function validateCedula(cedula: string): boolean {
  if (!cedula || typeof cedula !== 'string') return false;

  // Strip hyphens
  const clean = cedula.replace(/-/g, '').trim();

  // Must be exactly 11 digits
  if (!CEDULA_REGEX.test(cedula) || clean.length !== CEDULA_LENGTH)
    return false;
  if (!/^\d+$/.test(clean)) return false;

  // All-zero cédula is invalid
  if (/^0+$/.test(clean)) return false;

  // Luhn-like check digit algorithm used by JCE
  const digits = clean.split('').map(Number);
  const checkDigit = digits[CEDULA_LENGTH - 1];
  const multipliers = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];

  let sum = 0;
  for (let i = 0; i < CEDULA_LENGTH - 1; i++) {
    let product = digits[i] * multipliers[i];
    if (product > 9) product -= 9;
    sum += product;
  }

  const computed = (10 - (sum % 10)) % 10;
  return computed === checkDigit;
}

// ─── class-validator decorator ────────────────────────────────────────────────

@ValidatorConstraint({ name: 'IsCedulaDominicana', async: false })
export class IsCedulaDominicanaConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    return validateCedula(value);
  }

  defaultMessage(): string {
    return 'La cédula ($value) no es válida. Debe tener el formato ###-#######-# con dígito verificador correcto.';
  }
}

/**
 * Decorador reutilizable para validar cédula dominicana en cualquier DTO.
 *
 * @example
 * \@IsCedulaDominicana()
 * cedula: string;
 */
export function IsCedulaDominicana(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsCedulaDominicanaConstraint,
    });
  };
}
