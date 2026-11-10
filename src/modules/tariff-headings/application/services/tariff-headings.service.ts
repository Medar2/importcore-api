import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Decimal } from 'decimal.js';
import { TariffHeading } from '../../entities/tariff-heading.entity';
import {
  CreateTariffHeadingDto,
  UpdateTariffHeadingDto,
} from '../../presentation/dtos/tariff-heading.dto';

@Injectable()
export class TariffHeadingsService {
  constructor(
    @InjectRepository(TariffHeading)
    private readonly repo: Repository<TariffHeading>,
  ) {}

  async create(dto: CreateTariffHeadingDto): Promise<TariffHeading> {
    const exists = await this.repo.findOne({ where: { hsCode: dto.hsCode } });
    if (exists) throw new ConflictException('Ya existe esa partida arancelaria');
    this.assertRates(dto);

    return this.repo.save(
      this.repo.create({
        hsCode: dto.hsCode,
        description: dto.description,
        gravamenRate: dto.gravamenRate ?? '0',
        itbisRate: dto.itbisRate ?? '0.18',
        selectivoRate: dto.selectivoRate ?? '0',
      }),
    );
  }

  findAll(activeOnly = true): Promise<TariffHeading[]> {
    return this.repo.find({
      where: activeOnly ? { isActive: true } : {},
      order: { hsCode: 'ASC' },
    });
  }

  async findById(id: string): Promise<TariffHeading> {
    const h = await this.repo.findOne({ where: { id } });
    if (!h) throw new NotFoundException('Partida arancelaria no encontrada');
    return h;
  }

  async update(id: string, dto: UpdateTariffHeadingDto): Promise<TariffHeading> {
    const heading = await this.findById(id);
    this.assertRates(dto);
    Object.assign(heading, {
      description: dto.description ?? heading.description,
      gravamenRate: dto.gravamenRate ?? heading.gravamenRate,
      itbisRate: dto.itbisRate ?? heading.itbisRate,
      selectivoRate: dto.selectivoRate ?? heading.selectivoRate,
      isActive: dto.isActive ?? heading.isActive,
    });
    return this.repo.save(heading);
  }

  async remove(id: string): Promise<void> {
    const heading = await this.findById(id);
    heading.isActive = false;
    await this.repo.save(heading);
  }

  private assertRates(dto: {
    gravamenRate?: string;
    itbisRate?: string;
    selectivoRate?: string;
  }): void {
    for (const [k, v] of Object.entries(dto)) {
      if (v !== undefined && !new Decimal(v).isFinite()) {
        throw new BadRequestException(`Tasa invalida en ${k}`);
      }
    }
  }
}
