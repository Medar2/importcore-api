const IGNORED_KEYS = new Set([
  'updatedAt',
  'updated_at',
  'updatedBy',
  'updated_by',
  'createdAt',
  'created_at',
  'createdBy',
  'created_by',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return a === b;
}

/**
 * Compara dos objetos (típicamente una entidad antes/después de un UPDATE)
 * y devuelve solo los campos que cambiaron.
 * Devuelve null si no hay cambios.
 */
export function diffEntities(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): Record<string, { from: unknown; to: unknown }> | null {
  if (!before || !after) return null;

  const changes: Record<string, { from: unknown; to: unknown }> = {};

  for (const key of Object.keys(after)) {
    if (IGNORED_KEYS.has(key)) continue;
    const prev = before[key];
    const next = after[key];
    if (!valuesEqual(prev, next)) {
      changes[key] = { from: prev ?? null, to: next ?? null };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}
