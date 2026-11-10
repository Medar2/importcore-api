import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../rbac/guards/permissions.guard';
import { RequirePermission } from '../../../rbac/decorators/require-permission.decorator';
import { TariffHeadingsService } from '../../application/services/tariff-headings.service';
import {
  CreateTariffHeadingDto,
  UpdateTariffHeadingDto,
} from '../dtos/tariff-heading.dto';
import { TariffHeading } from '../../entities/tariff-heading.entity';

@ApiTags('tariff-headings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tariff-headings')
export class TariffHeadingsController {
  constructor(private readonly service: TariffHeadingsService) {}

  @Post()
  @RequirePermission('IMPORTCORE.PRODUCTS.WRITE')
  create(@Body() dto: CreateTariffHeadingDto): Promise<TariffHeading> {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('IMPORTCORE.PRODUCTS.READ')
  findAll(@Query('all') all?: string): Promise<TariffHeading[]> {
    return this.service.findAll(all !== 'true');
  }

  @Get(':id')
  @RequirePermission('IMPORTCORE.PRODUCTS.READ')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<TariffHeading> {
    return this.service.findById(id);
  }

  @Patch(':id')
  @RequirePermission('IMPORTCORE.PRODUCTS.WRITE')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTariffHeadingDto,
  ): Promise<TariffHeading> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('IMPORTCORE.PRODUCTS.WRITE')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.remove(id);
  }
}
