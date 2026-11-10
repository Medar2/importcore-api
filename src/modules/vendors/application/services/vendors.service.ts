import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from '../../entities/vendor.entity';
import {
  CreateVendorDto,
  UpdateVendorDto,
} from '../../presentation/dtos/vendor.dto';

@Injectable()
export class VendorsService {
  constructor(
    @InjectRepository(Vendor)
    private readonly repo: Repository<Vendor>,
  ) {}

  create(dto: CreateVendorDto): Promise<Vendor> {
    return this.repo.save(
      this.repo.create({
        name: dto.name,
        tradeName: dto.tradeName ?? null,
        countryCode: dto.countryCode ?? 'CN',
        contact: dto.contact ?? null,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        address: dto.address ?? null,
        paymentTerms: dto.paymentTerms ?? null,
        notes: dto.notes ?? null,
      }),
    );
  }

  findAll(activeOnly = true): Promise<Vendor[]> {
    return this.repo.find({
      where: activeOnly ? { isActive: true } : {},
      order: { name: 'ASC' },
    });
  }

  async findById(id: string): Promise<Vendor> {
    const v = await this.repo.findOne({ where: { id } });
    if (!v) throw new NotFoundException('Proveedor no encontrado');
    return v;
  }

  async update(id: string, dto: UpdateVendorDto): Promise<Vendor> {
    const vendor = await this.findById(id);
    Object.assign(vendor, {
      name: dto.name ?? vendor.name,
      tradeName: dto.tradeName ?? vendor.tradeName,
      contact: dto.contact ?? vendor.contact,
      phone: dto.phone ?? vendor.phone,
      email: dto.email ?? vendor.email,
      address: dto.address ?? vendor.address,
      paymentTerms: dto.paymentTerms ?? vendor.paymentTerms,
      notes: dto.notes ?? vendor.notes,
      isActive: dto.isActive ?? vendor.isActive,
    });
    return this.repo.save(vendor);
  }

  async remove(id: string): Promise<void> {
    const vendor = await this.findById(id);
    vendor.isActive = false;
    await this.repo.save(vendor);
  }
}
