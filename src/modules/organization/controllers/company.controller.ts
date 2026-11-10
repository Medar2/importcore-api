import {
  BadRequestException,
  Controller,
  Get,
  Put,
  Post,
  Body,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';
import { CompanyService } from '../services/company.service';
import { UpsertCompanyDto } from '../dto/company.dto';

@Controller('companies')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get('current')
  @RequirePermission('ORGANIZACION.VER')
  async getCurrent(@Req() req: any) {
    const company = await this.companyService.getCurrent(
      req.user?.organizationId,
    );
    return { success: true, data: company };
  }

  @Put('current')
  @RequirePermission('ORGANIZACION.EDITAR')
  async upsert(@Body() dto: UpsertCompanyDto, @Req() req: any) {
    const company = await this.companyService.upsert(
      dto,
      req.user?.organizationId,
      req.user?.id,
    );
    return { success: true, data: company };
  }

  @Post('current/logo')
  @RequirePermission('ORGANIZACION.EDITAR')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadLogo(
    @UploadedFile()
    file: {
      originalname: string;
      mimetype: string;
      buffer: Buffer;
      size: number;
    },
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('Selecciona una imagen para el logo');
    }

    const company = await this.companyService.uploadLogo(
      {
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        folder: 'company',
      },
      req.user?.organizationId,
      req.user?.id,
    );

    return { success: true, data: company };
  }
}
