/** Valor que viaja por HTTP en lugar de un secreto ya guardado. */
export const SECRET_MASK = '********';

const SECRET_KEY = /(^|[._])(PASS|PASSWORD|SECRET|TOKEN|API_?KEY|PRIVATE_?KEY)($|[._])/i;

export function isSecretKey(key: string): boolean {
  return SECRET_KEY.test(key);
}

export interface ConfigLike {
  key: string;
  value: string;
}

export type MaskedConfig<T extends ConfigLike> = T & {
  isSecret: boolean;
  hasValue: boolean;
};

/** Oculta el valor de las claves secretas; indica si hay valor guardado. */
export function maskConfig<T extends ConfigLike>(config: T): MaskedConfig<T> {
  const isSecret = isSecretKey(config.key);
  const hasValue = !!config.value;
  return {
    ...config,
    value: isSecret && hasValue ? SECRET_MASK : config.value,
    isSecret,
    hasValue,
  };
}

/**
 * Si un cliente devuelve la máscara tal cual, no se sobrescribe el secreto
 * real: se descarta `value` del cambio.
 */
export function withoutMaskedValue<T extends { value?: string }>(dto: T): T {
  if (dto.value !== SECRET_MASK) return dto;
  const { value: _ignored, ...rest } = dto;
  return rest as T;
}
