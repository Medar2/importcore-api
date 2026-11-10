import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  AFP_NUMBER_REGEX,
  ARS_NUMBER_REGEX,
  NSS_REGEX,
  VALID_AFP_NAMES,
  VALID_ARS_NAMES,
} from '../constants/dominican-laws.constants';

// ─── AFP ─────────────────────────────────────────────────────────────────────

/**
 * Valida el formato de número de afiliado AFP (11 dígitos numéricos).
 */
export function validateAfpNumber(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  return AFP_NUMBER_REGEX.test(value.trim());
}

/**
 * Valida que el nombre de la AFP sea uno de los autorizados por la SIPEN.
 */
export function validateAfpName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  return (VALID_AFP_NAMES as readonly string[]).includes(
    name.toUpperCase().trim(),
  );
}

@ValidatorConstraint({ name: 'IsAfpNumber', async: false })
export class IsAfpNumberConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    return validateAfpNumber(value);
  }
  defaultMessage(): string {
    return 'El número de AFP ($value) debe tener 11 dígitos numéricos.';
  }
}

export function IsAfpNumber(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsAfpNumberConstraint,
    });
  };
}

// ─── ARS ─────────────────────────────────────────────────────────────────────

/**
 * Valida el formato de número de afiliado ARS (11 dígitos numéricos).
 */
export function validateArsNumber(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  return ARS_NUMBER_REGEX.test(value.trim());
}

/**
 * Valida que el nombre de la ARS sea uno de los autorizados por la SISALRIL.
 */
export function validateArsName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  return (VALID_ARS_NAMES as readonly string[]).includes(
    name.toUpperCase().trim(),
  );
}

@ValidatorConstraint({ name: 'IsArsNumber', async: false })
export class IsArsNumberConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    return validateArsNumber(value);
  }
  defaultMessage(): string {
    return 'El número de ARS ($value) debe tener 11 dígitos numéricos.';
  }
}

export function IsArsNumber(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsArsNumberConstraint,
    });
  };
}

// ─── NSS ─────────────────────────────────────────────────────────────────────

/**
 * Valida el formato del Número de Seguridad Social (11 dígitos numéricos).
 */
export function validateNss(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  return NSS_REGEX.test(value.trim());
}

@ValidatorConstraint({ name: 'IsNss', async: false })
export class IsNssConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    return validateNss(value);
  }
  defaultMessage(): string {
    return 'El NSS ($value) debe tener 11 dígitos numéricos.';
  }
}

export function IsNss(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsNssConstraint,
    });
  };
}
