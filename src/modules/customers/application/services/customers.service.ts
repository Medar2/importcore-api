import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../entities/customer.entity';
import {
  normalizeRnc,
  validateRnc,
} from '../../domain/validators/rnc.validator';
import { validateCedula } from '../../../payroll-common/validators/cedula.validator';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
} from '../../presentation/dtos/customer.dto';

/** CRUD de clientes con validacion fiscal dominicana (RNC mod-11 / cedula). */
@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly repo: Repository<Customer>,
  ) {}

  async create(dto: CreateCustomerDto): Promise<Customer> {
    const taxId = this.assertValidTaxId(dto.taxId);
    const exists = await this.repo.findOne({ where: { taxId } });
    if (exists) throw new ConflictException('Ya existe un cliente con ese RNC/cédula');

    return this.repo.save(
      this.repo.create({
        name: dto.name,
        taxId,
        customerType: dto.customerType ?? 'NACIONAL',
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        address: dto.address ?? null,
        notes: dto.notes ?? null,
      }),
    );
  }

  findAll(activeOnly = true): Promise<Customer[]> {
    return this.repo.find({
      where: activeOnly ? { isActive: true } : {},
      order: { name: 'ASC' },
    });
  }

  async findPage(
    activeOnly: boolean,
    query: { search?: string; page?: number; pageSize?: number } = {},
  ): Promise<{ items: Customer[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, Math.floor(query.page ?? 1) || 1);
    const pageSize = Math.min(100, Math.max(1, Math.floor(query.pageSize ?? 20) || 20));

    const qb = this.repo.createQueryBuilder('c').orderBy('c.name', 'ASC');
    if (activeOnly) qb.andWhere('c.isActive = true');

    const term = query.search?.trim();
    if (term) {
      qb.andWhere(
        '(c.name ILIKE :term OR c.taxId ILIKE :term OR c.email ILIKE :term OR c.phone ILIKE :term)',
        { term: `%${term}%` },
      );
    }

    qb.skip((page - 1) * pageSize).take(pageSize);
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, pageSize };
  }

  async findById(id: string): Promise<Customer> {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Cliente no encontrado');
    return c;
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findById(id);
    Object.assign(customer, {
      name: dto.name ?? customer.name,
      phone: dto.phone ?? customer.phone,
      email: dto.email ?? customer.email,
      address: dto.address ?? customer.address,
      notes: dto.notes ?? customer.notes,
      isActive: dto.isActive ?? customer.isActive,
    });
    return this.repo.save(customer);
  }

  async remove(id: string): Promise<void> {
    const customer = await this.findById(id);
    customer.isActive = false;
    await this.repo.save(customer);
  }

  /** 9 digitos -> RNC mod11; 11 digitos -> cedula JCE (Luhn). */
  private assertValidTaxId(raw: string): string {
    const clean = normalizeRnc(raw);
    const valid =
      clean.length === 9 ? validateRnc(clean) : validateCedula(clean);
    if (!valid) {
      throw new BadRequestException(
        'RNC/cédula inválido: 9 dígitos (RNC mod-11) o 11 dígitos (cédula JCE)',
      );
    }
    return clean;
  }
}
