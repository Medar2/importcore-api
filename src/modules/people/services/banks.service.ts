import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bank } from '../entities/bank.entity';
import { CreateBankDto } from '../dtos/create-bank.dto';
import { UpdateBankDto } from '../dtos/update-bank.dto';
import { ListBanksQueryDto } from '../dtos/list-banks-query.dto';

@Injectable()
export class BanksService {
  constructor(
    @InjectRepository(Bank)
    private bankRepository: Repository<Bank>,
  ) {}

  async listBanks(query: ListBanksQueryDto) {
    const qb = this.bankRepository
      .createQueryBuilder('bank')
      .orderBy('bank.country', 'ASC')
      .addOrderBy('bank.name', 'ASC');

    if (query.search?.trim()) {
      const search = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(bank.name) LIKE :search OR LOWER(bank.code) LIKE :search OR LOWER(bank.country) LIKE :search)',
        { search },
      );
    }

    if (query.country?.trim() && query.country !== 'ALL') {
      qb.andWhere('bank.country = :country', { country: query.country.trim() });
    }

    if (query.status?.trim() && query.status !== 'ALL') {
      qb.andWhere('bank.status = :status', { status: query.status.trim() });
    }

    const limit = Math.min(
      200,
      Math.max(1, parseInt(query.limit || '100', 10)),
    );
    const page = Math.max(1, parseInt(query.page || '1', 10));
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getBank(id: string) {
    const bank = await this.bankRepository.findOne({ where: { id } });
    if (!bank) {
      throw new NotFoundException('Banco no encontrado');
    }
    return bank;
  }

  async createBank(dto: CreateBankDto, userId?: string) {
    const existing = await this.bankRepository.findOne({
      where: {
        name: dto.name.trim(),
        country: dto.country?.trim() || 'República Dominicana',
      },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe un banco con el nombre "${dto.name}" en ${dto.country || 'República Dominicana'}.`,
      );
    }

    const bank = this.bankRepository.create({
      name: dto.name.trim(),
      code: dto.code?.trim() || null,
      country: dto.country?.trim() || 'República Dominicana',
      status: dto.status || 'active',
      createdBy: userId,
      updatedBy: userId,
    });

    const saved = await this.bankRepository.save(bank);
    return {
      success: true,
      message: 'Banco registrado exitosamente',
      data: saved,
    };
  }

  async updateBank(id: string, dto: UpdateBankDto, userId?: string) {
    const bank = await this.getBank(id);

    if (dto.name !== undefined && dto.name.trim() !== bank.name) {
      const countryToCheck = dto.country?.trim() || bank.country;
      const existing = await this.bankRepository.findOne({
        where: {
          name: dto.name.trim(),
          country: countryToCheck,
        },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Ya existe otro banco con el nombre "${dto.name}" en ${countryToCheck}.`,
        );
      }
      bank.name = dto.name.trim();
    }

    if (dto.code !== undefined) bank.code = dto.code?.trim() || null;
    if (dto.country !== undefined)
      bank.country = dto.country.trim() || 'República Dominicana';
    if (dto.status !== undefined) bank.status = dto.status;
    bank.updatedBy = userId ?? bank.updatedBy;

    const saved = await this.bankRepository.save(bank);
    return {
      success: true,
      message: 'Banco actualizado exitosamente',
      data: saved,
    };
  }

  async deleteBank(id: string) {
    const bank = await this.getBank(id);
    try {
      await this.bankRepository.remove(bank);
      return { success: true, message: 'Banco eliminado correctamente' };
    } catch {
      bank.status = 'inactive';
      await this.bankRepository.save(bank);
      return {
        success: true,
        message:
          'El banco tiene cuentas vinculadas. Se ha marcado como inactivo.',
      };
    }
  }

  async getCountries() {
    const raw = await this.bankRepository
      .createQueryBuilder('bank')
      .select('DISTINCT bank.country', 'country')
      .orderBy('country', 'ASC')
      .getRawMany();

    return raw.map((r) => r.country).filter(Boolean);
  }
}
