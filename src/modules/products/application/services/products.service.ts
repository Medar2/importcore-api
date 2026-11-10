import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Decimal } from 'decimal.js';
import { Product } from '../../entities/product.entity';
import {
  CreateProductDto,
  UpdateProductDto,
} from '../../presentation/dtos/product.dto';

/** CRUD de productos con validacion de dimensiones/CBM (BR-002). */
@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const exists = await this.repo.findOne({ where: { sku: dto.sku } });
    if (exists) throw new ConflictException('Ya existe un producto con ese SKU');
    this.assertDimensions(dto);

    return this.repo.save(this.repo.create(this.toEntity(dto)));
  }

  findAll(activeOnly = true): Promise<Product[]> {
    return this.repo.find({
      where: activeOnly ? { isActive: true } : {},
      relations: ['vendor', 'tariffHeading'],
      order: { sku: 'ASC' },
    });
  }

  async findById(id: string): Promise<Product> {
    const p = await this.repo.findOne({
      where: { id },
      relations: ['vendor', 'tariffHeading'],
    });
    if (!p) throw new NotFoundException('Producto no encontrado');
    return p;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.repo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    this.assertDimensions(dto);
    Object.assign(product, this.toEntity(dto));
    return this.repo.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findById(id);
    product.isActive = false;
    await this.repo.save(product);
  }

  private assertDimensions(dto: {
    boxLengthM?: unknown;
    boxWidthM?: unknown;
    boxHeightM?: unknown;
  }): void {
    const dims: Array<[string, unknown]> = [
      ['boxLengthM', dto.boxLengthM],
      ['boxWidthM', dto.boxWidthM],
      ['boxHeightM', dto.boxHeightM],
    ];
    for (const [k, v] of dims) {
      if (v !== undefined && new Decimal(v as Decimal.Value).lte(0)) {
        throw new BadRequestException(`Dimension invalida: ${k} debe ser > 0`);
      }
    }
  }

  private toEntity(
    dto: Partial<Omit<CreateProductDto, 'vendorId' | 'tariffHeadingId'>> &
      UpdateProductDto,
  ) {
    return {
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.vendorId !== undefined ? { vendorId: dto.vendorId } : {}),
      ...(dto.tariffHeadingId !== undefined
        ? { tariffHeadingId: dto.tariffHeadingId }
        : {}),
      ...(dto.unitsPerBox !== undefined ? { unitsPerBox: dto.unitsPerBox } : {}),
      ...(dto.boxesPerPallet !== undefined
        ? { boxesPerPallet: dto.boxesPerPallet ?? null }
        : {}),
      ...(dto.boxLengthM !== undefined
        ? { boxLengthM: String(dto.boxLengthM) }
        : {}),
      ...(dto.boxWidthM !== undefined
        ? { boxWidthM: String(dto.boxWidthM) }
        : {}),
      ...(dto.boxHeightM !== undefined
        ? { boxHeightM: String(dto.boxHeightM) }
        : {}),
      ...(dto.boxGrossWeightKg !== undefined
        ? { boxGrossWeightKg: dto.boxGrossWeightKg != null ? String(dto.boxGrossWeightKg) : null }
        : {}),
      ...(dto.unitFobPriceUsd !== undefined
        ? { unitFobPriceUsd: dto.unitFobPriceUsd != null ? String(dto.unitFobPriceUsd) : null }
        : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.sku !== undefined ? { sku: dto.sku } : {}),
    };
  }
}
