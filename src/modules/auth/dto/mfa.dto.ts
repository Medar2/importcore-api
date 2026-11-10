import { IsString, Length } from 'class-validator';

export class VerifyMFADto {
  @IsString()
  tempToken: string;

  @IsString()
  @Length(6, 6)
  code: string;
}

export class EnableMFAResponseDto {
  secret: string;
  qrCode: string;
  recoveryCodes: string[];
}

export class DisableMFADto {
  @IsString()
  @Length(6, 6)
  code: string;
}

export class VerifyRecoveryCodeDto {
  @IsString()
  recoveryCode: string;
}
