const SENSITIVE_USER_FIELDS = ['passwordHash', 'mfaSecret', 'mfaRecoveryCodes'] as const;

type SafeUser<T> = Omit<T, (typeof SENSITIVE_USER_FIELDS)[number]>;

/** Quita hash de contraseña y secretos MFA antes de responder por HTTP. */
export function toSafeUser<T extends object>(user: T): SafeUser<T> {
  if (!user || typeof user !== 'object') return user;
  const copy = { ...user } as Record<string, unknown>;
  for (const field of SENSITIVE_USER_FIELDS) delete copy[field];
  return copy as SafeUser<T>;
}

export function toSafeUsers<T extends object>(users: T[]): SafeUser<T>[] {
  return users.map(toSafeUser);
}
