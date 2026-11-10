import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { CustomerType } from '../../entities/customer.entity';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  /** RNC (9 dig) o cedula (11 dig) — se normaliza y valida en servicio. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  taxId: string;

  @IsOptional()
  @IsIn(['NACIONAL', 'EXTRANJERO', 'GUBERNAMENTAL'])
  customerType?: CustomerType;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
