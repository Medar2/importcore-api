import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';
import { ModuleAccessGuard } from '../../app-modules/guards/module-access.guard';
import { RequireModule } from '../../app-modules/decorators/require-module.decorator';
import { BanksService } from '../services/banks.service';
import { CreateBankDto } from '../dtos/create-bank.dto';
import { UpdateBankDto } from '../dtos/update-bank.dto';
import { ListBanksQueryDto } from '../dtos/list-banks-query.dto';

@Controller('banks')
@RequireModule('PERSONAS')
@UseGuards(JwtAuthGuard, PermissionsGuard, ModuleAccessGuard)
export class BanksController {
  constructor(private readonly banksService: BanksService) {}

  @Get()
  async listBanks(@Query() query: ListBanksQueryDto) {
    const data = await this.banksService.listBanks(query);
    return { success: true, ...data };
  }

  @Get('countries')
  async getCountries() {
    const data = await this.banksService.getCountries();
    return { success: true, data };
  }

  @Get(':id')
  async getBank(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.banksService.getBank(id);
    return { success: true, data };
  }

  @Post()
  @RequirePermission('PEOPLE.WRITE')
  async createBank(@Body() dto: CreateBankDto, @Req() req: any) {
    return this.banksService.createBank(dto, req.user?.id);
  }

  @Put(':id')
  @RequirePermission('PEOPLE.WRITE')
  async updateBank(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBankDto,
    @Req() req: any,
  ) {
    return this.banksService.updateBank(id, dto, req.user?.id);
  }

  @Delete(':id')
  @RequirePermission('PEOPLE.WRITE')
  async deleteBank(@Param('id', ParseUUIDPipe) id: string) {
    return this.banksService.deleteBank(id);
  }
}
