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
import { VendorsService } from '../../application/services/vendors.service';
import {
  CreateVendorDto,
  UpdateVendorDto,
} from '../dtos/vendor.dto';
import { Vendor } from '../../entities/vendor.entity';

@ApiTags('vendors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('vendors')
export class VendorsController {
  constructor(private readonly service: VendorsService) {}

  @Post()
  @RequirePermission('IMPORTCORE.VENDORS.WRITE')
  create(@Body() dto: CreateVendorDto): Promise<Vendor> {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('IMPORTCORE.VENDORS.READ')
  findAll(@Query('all') all?: string): Promise<Vendor[]> {
    return this.service.findAll(all !== 'true');
  }

  @Get(':id')
  @RequirePermission('IMPORTCORE.VENDORS.READ')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Vendor> {
    return this.service.findById(id);
  }

  @Patch(':id')
  @RequirePermission('IMPORTCORE.VENDORS.WRITE')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVendorDto,
  ): Promise<Vendor> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('IMPORTCORE.VENDORS.WRITE')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.remove(id);
  }
}
