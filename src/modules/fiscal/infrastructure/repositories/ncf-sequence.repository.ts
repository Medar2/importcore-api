import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { ECfType } from '../../domain/dgii-catalogs';

export class NoSequenceAvailableError extends Error {
  constructor(type: ECfType) {
    super(`No hay secuencia e-NCF disponible para el tipo ${type} (no configurada, agotada o vencida)`);
  }
}

/** Asignación atómica de secuenciales e-NCF (un UPDATE ... RETURNING). */
@Injectable()
export class NcfSequenceRepository {
  async allocate(manager: EntityManager, type: ECfType): Promise<string> {
    const rows: { current_number: string }[] = await manager.query(
      `UPDATE "importcore"."ncf_sequences"
          SET "current_number" = "current_number" + 1, "updated_at" = now()
        WHERE "ecf_type" = $1
          AND "is_active" = true
          AND "current_number" < "end_number"
          AND ("expires_at" IS NULL OR "expires_at" >= CURRENT_DATE)
      RETURNING "current_number"`,
      [type],
    );
    const row = Array.isArray(rows[0]) ? (rows[0] as typeof rows)[0] : rows[0];
    if (!row) throw new NoSequenceAvailableError(type);
    return String(row.current_number);
  }
}
