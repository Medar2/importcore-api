import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBankDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del banco es obligatorio' })
  @MaxLength(150)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  country?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
