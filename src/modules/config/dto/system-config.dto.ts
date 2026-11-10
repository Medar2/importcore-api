import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';

export class CreateSystemConfigDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  group?: string;
}

export class UpdateSystemConfigDto {
  @IsString()
  @IsOptional()
  value?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  group?: string;
}

export class ConfigItemDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  group?: string;
}

export class BulkUpdateConfigDto {
  @IsNotEmpty()
  settings: ConfigItemDto[];
}

export class TestSmtpDto {
  @IsString()
  @IsOptional()
  host?: string;

  @IsOptional()
  port?: number | string;

  @IsString()
  @IsOptional()
  user?: string;

  @IsString()
  @IsOptional()
  pass?: string;

  @IsOptional()
  secure?: boolean | string;

  @IsString()
  @IsOptional()
  from?: string;

  @IsEmail()
  @IsNotEmpty()
  targetEmail: string;
}
