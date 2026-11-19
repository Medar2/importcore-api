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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../rbac/guards/permissions.guard';
import { RequirePermission } from '../../../rbac/decorators/require-permission.decorator';
import { ProductDetail, ProductsService } from '../../application/services/products.service';
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
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProductDetail> {
    return this.service.findDetailById(id);
  }

  @Patch(':id')
  @RequirePermission('IMPORTCORE.PRODUCTS.WRITE')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductDetail> {
    return this.service.update(id, dto);
  }

  @Post(':id/images')
  @RequirePermission('IMPORTCORE.PRODUCTS.WRITE')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadImages(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles()
    files: Array<{
      originalname: string;
      mimetype: string;
      buffer: Buffer;
      size: number;
    }>,
  ): Promise<ProductDetail> {
    return this.service.addImages(
      id,
      (files ?? []).map((file) => ({
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        folder: 'products',
      })),
    );
  }

  @Delete(':id')
  @RequirePermission('IMPORTCORE.PRODUCTS.WRITE')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.remove(id);
  }
}
