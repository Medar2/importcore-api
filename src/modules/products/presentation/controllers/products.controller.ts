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
import { ProductsService } from '../../application/services/products.service';
import {
  CreateProductDto,
  UpdateProductDto,
} from '../dtos/product.dto';
import { Product } from '../../entities/product.entity';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Post()
  @RequirePermission('IMPORTCORE.PRODUCTS.WRITE')
  create(@Body() dto: CreateProductDto): Promise<Product> {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('IMPORTCORE.PRODUCTS.READ')
  findAll(@Query('all') all?: string): Promise<Product[]> {
    return this.service.findAll(all !== 'true');
  }

  @Get(':id')
  @RequirePermission('IMPORTCORE.PRODUCTS.READ')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Product> {
    return this.service.findById(id);
  }

  @Patch(':id')
  @RequirePermission('IMPORTCORE.PRODUCTS.WRITE')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<Product> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('IMPORTCORE.PRODUCTS.WRITE')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.remove(id);
  }
}
