import { Controller, Get, Param, ParseEnumPipe, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../rbac/guards/permissions.guard';
import { RequirePermission } from '../../../rbac/decorators/require-permission.decorator';
import { GenerateDgiiReportUseCase } from '../../application/use-cases/generate-dgii-report.use-case';
import type { DgiiFormat } from '../../domain/dgii-report.formatter';

enum DgiiFormatParam {
  F606 = '606',
  F607 = '607',
  F608 = '608',
}

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports/dgii')
export class DgiiReportsController {
  constructor(private readonly generate: GenerateDgiiReportUseCase) {}

  /** TXT para la Oficina Virtual DGII. `?period=AAAAMM`. */
  @Get(':format')
  @RequirePermission('IMPORTCORE.FISCAL.READ')
  async download(
    @Param('format', new ParseEnumPipe(DgiiFormatParam)) format: DgiiFormat,
    @Query('period') period: string,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.generate.execute(format, period);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.setHeader('X-Record-Count', String(file.records));
    res.send(file.content);
  }
}
