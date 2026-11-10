import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Gender, IdentityType, PersonType } from '../entities/people.enums';
import { UpdateAddressDto } from './address.dto';
import { BankAccountDto } from './bank-account.dto';

export class UpdatePersonDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  commercialName?: string;

  @IsEnum(IdentityType)
  @IsOptional()
  identityType?: IdentityType;

  @IsString()
  @IsOptional()
  identityNumber?: string;

  @IsEmail({}, { message: 'El formato de correo no es válido' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  mobilePhone?: string;

  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsEnum(PersonType)
  @IsOptional()
  personType?: PersonType;

  @IsArray()
  @IsOptional()
  roles?: string[];

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsUUID()
  @IsOptional()
  companyId?: string;

  @ValidateNested()
  @Type(() => UpdateAddressDto)
  @IsOptional()
  address?: UpdateAddressDto;

  @ValidateNested({ each: true })
  @Type(() => BankAccountDto)
  @IsOptional()
  bankAccounts?: BankAccountDto[];
}
