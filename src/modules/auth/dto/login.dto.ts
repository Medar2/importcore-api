import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class LoginResponseDto {
  requireMFA: boolean;
  tempToken?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    username: string;
    nombre: string;
    apellido: string;
    organizationId: string | null;
    roles: any[];
  };
}
