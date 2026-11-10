import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NcfSequence } from '../../entities/ncf-sequence.entity';
import { formatEncf } from '../../domain/encf';
import type { CreateNcfSequenceDto } from '../../presentation/dtos/ncf-sequence.dto';

export interface NcfSequenceView extends NcfSequence {
  nextEncf: string | null;
  remaining: string;
}

/** Rangos e-NCF autorizados. Registrar uno nuevo desactiva el anterior del tipo. */
@Injectable()
export class NcfSequencesService {
  constructor(
    @InjectRepository(NcfSequence)
    private readonly repo: Repository<NcfSequence>,
    private readonly dataSource: DataSource,
  ) {}

  async list(): Promise<NcfSequenceView[]> {
    const rows = await this.repo.find({ order: { ecfType: 'ASC', createdAt: 'DESC' } });
    return rows.map((s) => {
      const current = BigInt(s.currentNumber);
      const end = BigInt(s.endNumber);
      return {
        ...s,
        nextEncf: s.isActive && current < end ? formatEncf(s.ecfType, current + 1n) : null,
        remaining: (end - current).toString(),
      };
    });
  }

  async create(dto: CreateNcfSequenceDto): Promise<NcfSequence> {
    const start = BigInt(dto.startNumber);
    const end = BigInt(dto.endNumber);
    if (start < 1n || end < start || end > 9_999_999_999n) {
      throw new BadRequestException('Rango invalido: 1 <= inicio <= fin <= 9999999999');
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.update(NcfSequence, { ecfType: dto.ecfType, isActive: true }, { isActive: false });
      return manager.save(
        manager.create(NcfSequence, {
          ecfType: dto.ecfType,
          currentNumber: (start - 1n).toString(),
          endNumber: end.toString(),
          expiresAt: dto.expiresAt ?? null,
          isActive: true,
        }),
      );
    });
  }
}
