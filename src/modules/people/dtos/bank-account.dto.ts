import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { BankAccountType } from '../entities/people.enums';

export class BankAccountDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsUUID()
  @IsNotEmpty({ message: 'El banco comercial es obligatorio' })
  bankId: string;

  @IsString()
  @IsNotEmpty({ message: 'El número de cuenta es obligatorio' })
  accountNumber: string;

  @IsEnum(BankAccountType)
  @IsOptional()
  accountType?: BankAccountType;

  @IsString()
  @IsOptional()
  accountHolder?: string;

  @IsString()
  @IsOptional()
  identityNumber?: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  bank?: any;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  bankCode?: string;

  @IsString()
  @IsOptional()
  bankCountry?: string;
}
