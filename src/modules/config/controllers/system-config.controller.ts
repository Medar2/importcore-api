import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { SystemConfigService } from '../services/system-config.service';
import {
  CreateSystemConfigDto,
  UpdateSystemConfigDto,
  BulkUpdateConfigDto,
  TestSmtpDto,
} from '../dto/system-config.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';
import { SECRET_MASK, maskConfig, withoutMaskedValue } from '../utils/secret-config';

@Controller('configuracion')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SystemConfigController {
  constructor(private configService: SystemConfigService) {}

  @Post()
  @RequirePermission('CONFIGURACION.SISTEMA.EDITAR')
  async create(@Body() createDto: CreateSystemConfigDto) {
    return maskConfig(await this.configService.create(createDto));
  }

  @Post('test-smtp')
  @RequirePermission('CONFIGURACION.SISTEMA.EDITAR')
  async testSmtp(@Body() testDto: TestSmtpDto) {
    const pass = testDto.pass === SECRET_MASK ? undefined : testDto.pass;
    return this.configService.testSmtpConnection({ ...testDto, pass });
  }

  @Get()
  @RequirePermission('CONFIGURACION.SISTEMA.VER')
  async findAll() {
    return (await this.configService.findAll()).map(maskConfig);
  }

  @Get('group/:group')
  @RequirePermission('CONFIGURACION.SISTEMA.VER')
  async findByGroup(@Param('group') group: string) {
    return (await this.configService.findByGroup(group)).map(maskConfig);
  }

  @Get(':key')
  @RequirePermission('CONFIGURACION.SISTEMA.VER')
  async findByKey(@Param('key') key: string) {
    return maskConfig(await this.configService.findByKey(key));
  }

  @Patch('bulk')
  @RequirePermission('CONFIGURACION.SISTEMA.EDITAR')
  async updateBulk(@Body() bulkDto: BulkUpdateConfigDto) {
    const settings = bulkDto.settings.map(withoutMaskedValue);
    return (await this.configService.updateBulk({ settings })).map(maskConfig);
  }

  @Patch(':key')
  @RequirePermission('CONFIGURACION.SISTEMA.EDITAR')
  async update(@Param('key') key: string, @Body() updateDto: UpdateSystemConfigDto) {
    return maskConfig(await this.configService.update(key, withoutMaskedValue(updateDto)));
  }
}
