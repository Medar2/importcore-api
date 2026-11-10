import { IsBoolean } from 'class-validator';

export class UpdateAppModuleDto {
  @IsBoolean()
  enabled: boolean;
}
