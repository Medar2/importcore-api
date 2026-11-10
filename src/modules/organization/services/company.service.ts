import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../entities/company.entity';
import { UpsertCompanyDto } from '../dto/company.dto';
import { StorageService } from '../../storage/storage.service';
import { UploadFileInput } from '../../storage/storage.types';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly storageService: StorageService,
  ) {}

  async getCurrent(organizationId?: string | null): Promise<Company | null> {
    if (organizationId) {
      const byOrg = await this.companyRepository.findOne({
        where: { organizationId },
        order: { createdAt: 'ASC' },
      });
      if (byOrg) return byOrg;
    }

    const [first] = await this.companyRepository.find({
      order: { createdAt: 'ASC' },
      take: 1,
    });
    return first ?? null;
  }

  async upsert(
    dto: UpsertCompanyDto,
    organizationId?: string | null,
    userId?: string,
  ): Promise<Company> {
    const current = await this.getCurrent(organizationId);
    const taxId = dto.taxId?.trim() ? dto.taxId.trim() : null;

    if (current) {
      Object.assign(current, {
        ...dto,
        taxId,
        updatedBy: userId ?? current.updatedBy,
      });
      if (!current.organizationId && organizationId) {
        current.organizationId = organizationId;
      }
      return this.companyRepository.save(current);
    }

    const created = this.companyRepository.create({
      ...dto,
      taxId,
      status: 'active',
      organizationId: organizationId ?? null,
      createdBy: userId,
      updatedBy: userId,
    });
    return this.companyRepository.save(created);
  }

  async uploadLogo(
    file: UploadFileInput,
    organizationId?: string | null,
    userId?: string,
  ): Promise<Company> {
    let company = await this.getCurrent(organizationId);
    if (!company) {
      company = this.companyRepository.create({
        name: 'Mi salón',
        status: 'active',
        organizationId: organizationId ?? null,
        createdBy: userId,
      });
      company = await this.companyRepository.save(company);
    }

    const stored = await this.storageService.upload({
      ...file,
      folder: 'company',
    });
    company.logoUrl = stored.url;
    company.updatedBy = userId ?? company.updatedBy;
    return this.companyRepository.save(company);
  }
}
