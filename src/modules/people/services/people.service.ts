import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, DeepPartial } from 'typeorm';
import { Person } from '../entities/person.entity';
import { Address } from '../entities/address.entity';
import { PersonBankAccount } from '../entities/person-bank-account.entity';
import { Bank } from '../entities/bank.entity';
import { SystemConfig } from '../../config/entities/system-config.entity';
import { CreatePersonDto } from '../dtos/create-person.dto';
import { UpdatePersonDto } from '../dtos/update-person.dto';
import { ListPeopleQueryDto } from '../dtos/list-people-query.dto';
import {
  Gender,
  IdentityType,
  PersonType,
  BankAccountType,
} from '../entities/people.enums';
import { validateCedula } from '../../payroll-common/validators/cedula.validator';

@Injectable()
export class PeopleService {
  constructor(
    @InjectRepository(Person)
    private personRepository: Repository<Person>,
    @InjectRepository(Address)
    private addressRepository: Repository<Address>,
    @InjectRepository(PersonBankAccount)
    private bankAccountRepository: Repository<PersonBankAccount>,
    @InjectRepository(Bank)
    private bankRepository: Repository<Bank>,
    @InjectRepository(SystemConfig)
    private configRepository: Repository<SystemConfig>,
  ) {}

  async listPeople(query: ListPeopleQueryDto, _organizationId?: string | null) {
    const qb = this.personRepository
      .createQueryBuilder('person')
      .leftJoinAndSelect('person.addresses', 'address')
      .leftJoinAndSelect('person.bankAccounts', 'bankAccount')
      .leftJoinAndSelect('bankAccount.bank', 'bank')
      .orderBy('person.firstName', 'ASC');

    if (query.search?.trim()) {
      const search = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(person.firstName) LIKE :search OR LOWER(person.lastName) LIKE :search OR LOWER(person.commercialName) LIKE :search OR LOWER(person.identityNumber) LIKE :search OR LOWER(person.email) LIKE :search OR person.phoneNumber LIKE :search OR person.mobilePhone LIKE :search)',
        { search },
      );
    }

    if (query.role?.trim() && query.role !== 'ALL') {
      const role = query.role.trim().toUpperCase();
      qb.andWhere('person.roles LIKE :role', { role: `%${role}%` });
    }

    if (query.status?.trim() && query.status !== 'ALL') {
      qb.andWhere('person.status = :status', { status: query.status });
    }

    if (query.identityType?.trim() && query.identityType !== 'ALL') {
      qb.andWhere('person.identityType = :identityType', {
        identityType: query.identityType,
      });
    }

    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10)));
    const page = Math.max(1, parseInt(query.page || '1', 10));
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((p) => this.toResponse(p)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPerson(id: string) {
    const person = await this.personRepository.findOne({
      where: { id },
      relations: ['addresses', 'bankAccounts', 'bankAccounts.bank'],
    });

    if (!person) {
      throw new NotFoundException('Persona no encontrada');
    }

    return this.toResponse(person);
  }

  async createPerson(
    dtoOrData: CreatePersonDto | DeepPartial<Person>,
    organizationIdOrManager?: string | null | EntityManager,
    userId?: string,
    managerParam?: EntityManager,
  ): Promise<any> {
    let manager: EntityManager | undefined;
    let _organizationId: string | null | undefined;

    if (
      organizationIdOrManager &&
      typeof (organizationIdOrManager as any).getRepository === 'function'
    ) {
      manager = organizationIdOrManager as EntityManager;
    } else {
      _organizationId = organizationIdOrManager as string | null | undefined;
      manager = managerParam;
    }

    const personRepo = manager
      ? manager.getRepository(Person)
      : this.personRepository;
    const addressRepo = manager
      ? manager.getRepository(Address)
      : this.addressRepository;

    const dto = dtoOrData as CreatePersonDto;

    // Validar cédula dominicana si la configuración está activa
    const identityTypeToCheck = dto.identityType || IdentityType.CEDULA;
    if (
      identityTypeToCheck === IdentityType.CEDULA &&
      dto.identityNumber?.trim()
    ) {
      const config = await this.configRepository.findOne({
        where: { key: 'VALIDATION.CEDULA_DOMINICANA' },
      });
      const validateCedulaSetting = config ? config.value : 'true';
      if (
        validateCedulaSetting === 'true' &&
        !validateCedula(dto.identityNumber.trim())
      ) {
        throw new BadRequestException(
          'La cédula ingresada no es válida según el algoritmo de la JCE.',
        );
      }
    }

    // Validar unicidad de número de identidad si está presente
    if (dto.identityNumber?.trim()) {
      const existing = await personRepo.findOne({
        where: { identityNumber: dto.identityNumber.trim() },
      });
      if (existing) {
        throw new ConflictException(
          `Ya existe una persona registrada con el documento Nº ${dto.identityNumber.trim()}`,
        );
      }
    }

    // Validar unicidad de email si está presente
    if (dto.email?.trim()) {
      const existingEmail = await personRepo.findOne({
        where: { email: dto.email.trim().toLowerCase() },
      });
      if (existingEmail) {
        throw new ConflictException(
          `Ya existe una persona registrada con el correo ${dto.email.trim().toLowerCase()}`,
        );
      }
    }

    const roles =
      Array.isArray(dto.roles) && dto.roles.length > 0 ? dto.roles : ['CLIENT'];

    const person = personRepo.create({
      firstName: (dto.firstName || '').trim(),
      lastName: (dto.lastName || '').trim(),
      commercialName: dto.commercialName?.trim() || null,
      identityType: dto.identityType || IdentityType.CEDULA,
      identityNumber: dto.identityNumber?.trim() || '',
      email: dto.email?.trim().toLowerCase() || '',
      phoneNumber: dto.phoneNumber?.trim() || '',
      mobilePhone: dto.mobilePhone?.trim() || null,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
      gender: dto.gender || Gender.OTHER,
      personType: dto.personType || PersonType.INDIVIDUAL,
      roles,
      status: dto.status || 'active',
      notes: dto.notes?.trim() || null,
      companyId: dto.companyId || null,
      createdBy: userId,
      updatedBy: userId,
    });

    const savedPerson = await personRepo.save(person);

    // Guardar dirección si viene en el payload
    if (
      dto.address &&
      (dto.address.stateProvince ||
        dto.address.city ||
        dto.address.sector ||
        dto.address.street)
    ) {
      const address = addressRepo.create({
        country: dto.address.country || 'República Dominicana',
        stateProvince: dto.address.stateProvince || null,
        city: dto.address.city || null,
        sector: dto.address.sector || null,
        street: dto.address.street || null,
        houseNumber: dto.address.houseNumber || null,
        reference: dto.address.reference || null,
        zipCode: dto.address.zipCode || null,
        isPrimary: dto.address.isPrimary ?? true,
        personId: savedPerson.id,
        createdBy: userId,
        updatedBy: userId,
      });
      await addressRepo.save(address);
      savedPerson.addresses = [address];
    } else {
      savedPerson.addresses = [];
    }

    // Guardar cuentas bancarias si vienen en el payload
    const bankAccountRepo = manager
      ? manager.getRepository(PersonBankAccount)
      : this.bankAccountRepository;

    if (dto.bankAccounts && dto.bankAccounts.length > 0) {
      const accounts = dto.bankAccounts.map((acc) =>
        bankAccountRepo.create({
          personId: savedPerson.id,
          bankId: acc.bankId,
          accountNumber: acc.accountNumber.trim(),
          accountType: acc.accountType || BankAccountType.SAVINGS,
          accountHolder: acc.accountHolder?.trim() || null,
          identityNumber: acc.identityNumber?.trim() || null,
          isPrimary: Boolean(acc.isPrimary),
          notes: acc.notes?.trim() || null,
          createdBy: userId,
          updatedBy: userId,
        }),
      );
      savedPerson.bankAccounts = await bankAccountRepo.save(accounts);
    } else {
      savedPerson.bankAccounts = [];
    }

    return this.toResponse(savedPerson);
  }

  async updatePerson(
    id: string,
    dtoOrData: UpdatePersonDto | DeepPartial<Person>,
    organizationIdOrManager?: string | null | EntityManager,
    userId?: string,
    managerParam?: EntityManager,
  ): Promise<any> {
    let manager: EntityManager | undefined;

    if (
      organizationIdOrManager &&
      typeof (organizationIdOrManager as any).getRepository === 'function'
    ) {
      manager = organizationIdOrManager as EntityManager;
    } else {
      manager = managerParam;
    }

    const personRepo = manager
      ? manager.getRepository(Person)
      : this.personRepository;
    const addressRepo = manager
      ? manager.getRepository(Address)
      : this.addressRepository;

    const person = await personRepo.findOne({
      where: { id },
      relations: ['addresses', 'bankAccounts', 'bankAccounts.bank'],
    });

    if (!person) {
      throw new NotFoundException('Persona no encontrada');
    }

    const dto = dtoOrData as UpdatePersonDto;

    // Validar cédula dominicana según configuración del sistema si aplica
    const effectiveIdentityType =
      dto.identityType !== undefined
        ? dto.identityType
        : person.identityType;
    const effectiveIdentityNumber =
      dto.identityNumber !== undefined
        ? dto.identityNumber?.trim()
        : person.identityNumber;

    if (
      effectiveIdentityType === IdentityType.CEDULA &&
      effectiveIdentityNumber
    ) {
      const config = await this.configRepository.findOne({
        where: { key: 'VALIDATION.CEDULA_DOMINICANA' },
      });
      const validateCedulaSetting = config ? config.value : 'true';
      if (
        validateCedulaSetting === 'true' &&
        !validateCedula(effectiveIdentityNumber)
      ) {
        throw new BadRequestException(
          'La cédula ingresada no es válida según el algoritmo de la JCE.',
        );
      }
    }

    // Validar unicidad si cambió el identityNumber
    if (
      dto.identityNumber !== undefined &&
      dto.identityNumber?.trim() !== person.identityNumber
    ) {
      if (dto.identityNumber?.trim()) {
        const existing = await personRepo.findOne({
          where: { identityNumber: dto.identityNumber.trim() },
        });
        if (existing && existing.id !== id) {
          throw new ConflictException(
            `Ya existe otra persona registrada con el documento Nº ${dto.identityNumber.trim()}`,
          );
        }
      }
      person.identityNumber = dto.identityNumber?.trim() || '';
    }

    // Validar unicidad si cambió el email
    if (
      dto.email !== undefined &&
      dto.email?.trim().toLowerCase() !== person.email
    ) {
      if (dto.email?.trim()) {
        const existingEmail = await personRepo.findOne({
          where: { email: dto.email.trim().toLowerCase() },
        });
        if (existingEmail && existingEmail.id !== id) {
          throw new ConflictException(
            `Ya existe otra persona con el correo ${dto.email.trim().toLowerCase()}`,
          );
        }
      }
      person.email = dto.email?.trim().toLowerCase() || '';
    }

    if (dto.firstName !== undefined) person.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined)
      person.lastName = (dto.lastName || '').trim();
    if (dto.commercialName !== undefined)
      person.commercialName = dto.commercialName?.trim() || null;
    if (dto.identityType !== undefined) person.identityType = dto.identityType;
    if (dto.phoneNumber !== undefined)
      person.phoneNumber = (dto.phoneNumber || '').trim();
    if (dto.mobilePhone !== undefined)
      person.mobilePhone = dto.mobilePhone?.trim() || null;
    if (dto.birthDate !== undefined)
      person.birthDate = dto.birthDate ? new Date(dto.birthDate) : null;
    if (dto.gender !== undefined) person.gender = dto.gender;
    if (dto.personType !== undefined) person.personType = dto.personType;
    if (dto.roles !== undefined) person.roles = dto.roles;
    if (dto.status !== undefined) person.status = dto.status;
    if (dto.notes !== undefined) person.notes = dto.notes?.trim() || null;
    if (dto.companyId !== undefined) person.companyId = dto.companyId || null;
    person.updatedBy = userId ?? person.updatedBy;

    const saved = await personRepo.save(person);

    // Actualizar o crear dirección principal
    if (dto.address) {
      let primaryAddress =
        person.addresses?.find((a) => a.isPrimary) || person.addresses?.[0];
      if (primaryAddress) {
        if (dto.address.country !== undefined)
          primaryAddress.country = dto.address.country;
        if (dto.address.stateProvince !== undefined)
          primaryAddress.stateProvince = dto.address.stateProvince || null;
        if (dto.address.city !== undefined)
          primaryAddress.city = dto.address.city || null;
        if (dto.address.sector !== undefined)
          primaryAddress.sector = dto.address.sector || null;
        if (dto.address.street !== undefined)
          primaryAddress.street = dto.address.street || null;
        if (dto.address.houseNumber !== undefined)
          primaryAddress.houseNumber = dto.address.houseNumber || null;
        if (dto.address.reference !== undefined)
          primaryAddress.reference = dto.address.reference || null;
        if (dto.address.zipCode !== undefined)
          primaryAddress.zipCode = dto.address.zipCode || null;
        primaryAddress.updatedBy = userId ?? primaryAddress.updatedBy;
        await addressRepo.save(primaryAddress);
      } else if (
        dto.address.stateProvince ||
        dto.address.city ||
        dto.address.sector ||
        dto.address.street
      ) {
        primaryAddress = addressRepo.create({
          country: dto.address.country || 'República Dominicana',
          stateProvince: dto.address.stateProvince || null,
          city: dto.address.city || null,
          sector: dto.address.sector || null,
          street: dto.address.street || null,
          houseNumber: dto.address.houseNumber || null,
          reference: dto.address.reference || null,
          zipCode: dto.address.zipCode || null,
          isPrimary: true,
          personId: saved.id,
          createdBy: userId,
          updatedBy: userId,
        });
        await addressRepo.save(primaryAddress);
        saved.addresses = [primaryAddress];
      }
    }

    // Actualizar cuentas bancarias si vienen en el payload
    const bankAccountRepo = manager
      ? manager.getRepository(PersonBankAccount)
      : this.bankAccountRepository;

    if (dto.bankAccounts !== undefined) {
      await bankAccountRepo.delete({ personId: id });
      if (dto.bankAccounts && dto.bankAccounts.length > 0) {
        const accounts = dto.bankAccounts.map((acc) =>
          bankAccountRepo.create({
            personId: id,
            bankId: acc.bankId,
            accountNumber: acc.accountNumber.trim(),
            accountType: acc.accountType || BankAccountType.SAVINGS,
            accountHolder: acc.accountHolder?.trim() || null,
            identityNumber: acc.identityNumber?.trim() || null,
            isPrimary: Boolean(acc.isPrimary),
            notes: acc.notes?.trim() || null,
            createdBy: userId,
            updatedBy: userId,
          }),
        );
        saved.bankAccounts = await bankAccountRepo.save(accounts);
      } else {
        saved.bankAccounts = [];
      }
    }

    return this.toResponse(saved);
  }

  async deletePerson(id: string) {
    const person = await this.personRepository.findOne({
      where: { id },
      relations: ['addresses', 'bankAccounts'],
    });

    if (!person) {
      throw new NotFoundException('Persona no encontrada');
    }

    try {
      await this.personRepository.remove(person);
      return { success: true, message: 'Persona eliminada correctamente' };
    } catch {
      person.status = 'inactive';
      await this.personRepository.save(person);
      return {
        success: true,
        message:
          'La persona tiene registros asociados en el sistema. Se ha marcado como inactiva.',
      };
    }
  }

  async searchByIdentity(identityNumber: string) {
    const cleanNumber = identityNumber.trim();
    if (!cleanNumber) return null;

    const person = await this.personRepository.findOne({
      where: { identityNumber: cleanNumber },
      relations: ['addresses', 'bankAccounts', 'bankAccounts.bank'],
    });

    return person ? this.toResponse(person) : null;
  }

  async findByEmail(email: string): Promise<Person | null> {
    return this.personRepository.findOne({
      where: { email: email.trim().toLowerCase() },
      relations: ['addresses', 'bankAccounts', 'bankAccounts.bank'],
    });
  }

  async findById(id: string): Promise<Person | null> {
    const person = await this.personRepository.findOne({
      where: { id },
      relations: ['addresses', 'bankAccounts', 'bankAccounts.bank'],
    });
    return person ? (this.toResponse(person) as any) : null;
  }

  async findByIdentityNumber(identityNumber: string): Promise<Person | null> {
    return this.personRepository.findOne({
      where: { identityNumber: identityNumber.trim() },
      relations: ['addresses', 'bankAccounts', 'bankAccounts.bank'],
    });
  }

  async createAddress(
    data: DeepPartial<Address>,
    manager?: EntityManager,
  ): Promise<Address> {
    const addressRepo = manager
      ? manager.getRepository(Address)
      : this.addressRepository;
    const address = addressRepo.create(data);
    return addressRepo.save(address);
  }

  private toResponse(person: Person) {
    const primaryAddress =
      person.addresses?.find((a) => a.isPrimary) ||
      person.addresses?.[0] ||
      null;

    const roles = Array.isArray(person.roles)
      ? person.roles
      : typeof person.roles === 'string'
        ? (person.roles as string).split(',')
        : ['CLIENT'];

    const bankAccounts = Array.isArray(person.bankAccounts)
      ? person.bankAccounts.map((acc: any) => ({
          id: acc.id,
          bankId: acc.bankId,
          bankName: acc.bank?.name || '',
          bankCode: acc.bank?.code || '',
          bankCountry: acc.bank?.country || 'República Dominicana',
          accountNumber: acc.accountNumber,
          accountType: acc.accountType,
          accountHolder: acc.accountHolder,
          identityNumber: acc.identityNumber,
          isPrimary: Boolean(acc.isPrimary),
          notes: acc.notes,
        }))
      : [];

    return {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      commercialName: person.commercialName,
      fullName: [person.firstName, person.lastName].filter(Boolean).join(' '),
      identityType: person.identityType,
      identityNumber: person.identityNumber,
      email: person.email,
      phoneNumber: person.phoneNumber,
      mobilePhone: person.mobilePhone,
      birthDate: person.birthDate,
      gender: person.gender,
      personType: person.personType,
      roles,
      status: person.status,
      notes: person.notes,
      companyId: person.companyId,
      address: primaryAddress
        ? {
            id: primaryAddress.id,
            country: primaryAddress.country,
            stateProvince: primaryAddress.stateProvince,
            city: primaryAddress.city,
            sector: primaryAddress.sector,
            street: primaryAddress.street,
            houseNumber: primaryAddress.houseNumber,
            reference: primaryAddress.reference,
            zipCode: primaryAddress.zipCode,
            fullAddress: [
              primaryAddress.street,
              primaryAddress.houseNumber
                ? `No. ${primaryAddress.houseNumber}`
                : null,
              primaryAddress.sector,
              primaryAddress.city,
              primaryAddress.stateProvince,
            ]
              .filter(Boolean)
              .join(', '),
          }
        : null,
      bankAccounts,
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
    };
  }
}
