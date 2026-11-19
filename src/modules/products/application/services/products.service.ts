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
import { StorageService } from '../../../storage/storage.service';
import { UploadFileInput } from '../../../storage/storage.types';

const MAX_PRODUCT_IMAGES = 10;
const RELATED_PRODUCT_LIMIT = 8;
const DESCRIPTION_STOP_WORDS = new Set([
  'con',
  'del',
  'los',
  'las',
  'una',
  'unos',
  'unas',
  'por',
  'para',
  'como',
  'mas',
  'muy',
]);

export interface ProductDetail extends Product {
  relatedProducts: Product[];
}

/** CRUD de productos con validacion de dimensiones/CBM (BR-002). */
@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
    private readonly storageService: StorageService,
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

  async findDetailById(id: string): Promise<ProductDetail> {
    const product = await this.findById(id);
    const relatedProducts = await this.findRelatedProducts(product);
    return { ...product, relatedProducts };
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductDetail> {
    const product = await this.repo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    this.assertDimensions(dto);
    Object.assign(product, this.toEntity(dto));
    await this.repo.save(product);
    return this.findDetailById(id);
  }

  async addImages(id: string, files: UploadFileInput[]): Promise<ProductDetail> {
    if (!files.length) {
      throw new BadRequestException('Selecciona al menos una imagen');
    }

    const product = await this.findById(id);
    const current = this.normalizeImageUrls(product.imageUrls ?? []);
    if (current.length + files.length > MAX_PRODUCT_IMAGES) {
      throw new BadRequestException(
        `Un producto puede tener máximo ${MAX_PRODUCT_IMAGES} imágenes`,
      );
    }

    const uploaded = await Promise.all(
      files.map((file) =>
        this.storageService.upload({ ...file, folder: 'products' }),
      ),
    );

    product.imageUrls = [
      ...current,
      ...uploaded.map((file) => file.url),
    ].slice(0, MAX_PRODUCT_IMAGES);
    await this.repo.save(product);
    return this.findDetailById(id);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findById(id);
    product.isActive = false;
    await this.repo.save(product);
  }

  private async findRelatedProducts(product: Product): Promise<Product[]> {
    const candidates = await this.repo.find({
      where: { isActive: true },
      relations: ['vendor', 'tariffHeading'],
      order: { updatedAt: 'DESC' },
    });
    const terms = this.descriptionTokens(product.description);
    const scored = candidates
      .filter((candidate) => candidate.id !== product.id)
      .map((candidate) => ({
        candidate,
        score: this.relatedScore(product, candidate, terms),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, RELATED_PRODUCT_LIMIT)
      .map((item) => item.candidate);

    if (scored.length) return scored;
    return candidates
      .filter((candidate) => candidate.id !== product.id)
      .slice(0, RELATED_PRODUCT_LIMIT);
  }

  private relatedScore(
    product: Product,
    candidate: Product,
    terms: Set<string>,
  ): number {
    let score = 0;
    if (
      product.tariffHeadingId &&
      candidate.tariffHeadingId === product.tariffHeadingId
    ) {
      score += 100;
    }
    if (product.vendorId && candidate.vendorId === product.vendorId) {
      score += 50;
    }

    const candidateTerms = this.descriptionTokens(candidate.description);
    for (const term of terms) {
      if (candidateTerms.has(term)) score += 12;
    }
    return score;
  }

  private descriptionTokens(description: string): Set<string> {
    return new Set(
      description
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .split(/[^a-z0-9]+/i)
        .filter((token) => token.length > 2 && !DESCRIPTION_STOP_WORDS.has(token)),
    );
  }

  private normalizeImageUrls(value: unknown): string[] {
    if (!Array.isArray(value)) {
      throw new BadRequestException('imageUrls debe ser una lista de URLs');
    }
    const urls = value.map((item) => String(item).trim()).filter(Boolean);
    if (urls.length > MAX_PRODUCT_IMAGES) {
      throw new BadRequestException(
        `Un producto puede tener máximo ${MAX_PRODUCT_IMAGES} imágenes`,
      );
    }
    if (urls.some((url) => !this.isAllowedImageUrl(url))) {
      throw new BadRequestException(
        'Las imágenes deben usar URLs http(s) o rutas internas /uploads/...',
      );
    }
    return [...new Set(urls)];
  }

  private isAllowedImageUrl(url: string): boolean {
    return /^https?:\/\//i.test(url) || url.startsWith('/');
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
      ...(dto.imageUrls !== undefined
        ? { imageUrls: this.normalizeImageUrls(dto.imageUrls) }
        : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.sku !== undefined ? { sku: dto.sku } : {}),
    };
  }
}
