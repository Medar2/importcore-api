import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateUserDto {
  @IsUUID('4', { message: 'Debe seleccionar una persona registrada válida' })
  @IsOptional()
  personId?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @ValidateIf((o) => Boolean(o.email))
  @IsEmail({}, { message: 'El formato de correo no es válido' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  apellido?: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsArray()
  @IsOptional()
  roles?: string[];

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}

export class UpdateUserDto {
  @IsUUID('4', { message: 'El ID de persona debe ser un UUID válido' })
  @IsOptional()
  personId?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @ValidateIf((o) => Boolean(o.email))
  @IsEmail({}, { message: 'El formato de correo no es válido' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  apellido?: string;

  @ValidateIf((o) => Boolean(o.password))
  @IsString()
  @IsOptional()
  @MinLength(6, {
    message: 'La nueva contraseña debe tener al menos 6 caracteres',
  })
  password?: string;

  @IsArray()
  @IsOptional()
  roles?: string[];

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'La nueva contraseña es obligatoria' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  newPassword: string;
}
