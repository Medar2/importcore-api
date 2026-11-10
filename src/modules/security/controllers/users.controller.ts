import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Patch,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { UsersService } from '../services/users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
} from '../dto/users.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { toSafeUser, toSafeUsers } from '../utils/safe-user';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private extractActor(user: any, req: any) {
    return {
      id: user?.id,
      email: user?.email || user?.person?.email || user?.username,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers ? req.headers['user-agent'] : undefined,
    };
  }

  @Get()
  @RequirePermission('ADMINISTRACION.USUARIOS.VER')
  async findAll() {
    return toSafeUsers(await this.usersService.findAll());
  }

  @Get(':id')
  @RequirePermission('ADMINISTRACION.USUARIOS.VER')
  async findOne(@Param('id') id: string) {
    return toSafeUser(await this.usersService.findOne(id));
  }

  @Post()
  @RequirePermission('ADMINISTRACION.USUARIOS.CREAR')
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return toSafeUser(await this.usersService.create(dto, this.extractActor(user, req)));
  }

  @Put(':id')
  @RequirePermission('ADMINISTRACION.USUARIOS.EDITAR')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return toSafeUser(await this.usersService.update(id, dto, this.extractActor(user, req)));
  }

  @Patch(':id/status')
  @RequirePermission('ADMINISTRACION.USUARIOS.EDITAR')
  async setStatus(
    @Param('id') id: string,
    @Body('active') active: boolean,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return toSafeUser(await this.usersService.setStatus(id, active, this.extractActor(user, req)));
  }

  @Post(':id/password')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('ADMINISTRACION.USUARIOS.EDITAR')
  async changePassword(
    @Param('id') id: string,
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    await this.usersService.changePassword(id, dto.newPassword, this.extractActor(user, req));
    return { message: 'Password changed successfully' };
  }

  @Post(':id/send-reset-link')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('ADMINISTRACION.USUARIOS.EDITAR')
  async sendResetLink(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.usersService.sendPasswordResetLink(id, this.extractActor(user, req));
  }

  @Post(':id/roles/:roleId')
  @RequirePermission('ADMINISTRACION.USUARIOS.EDITAR')
  async assignRole(
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return toSafeUser(await this.usersService.assignRole(id, roleId, this.extractActor(user, req)));
  }

  @Delete(':id/roles/:roleId')
  @RequirePermission('ADMINISTRACION.USUARIOS.EDITAR')
  async removeRole(
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return toSafeUser(await this.usersService.removeRole(id, roleId, this.extractActor(user, req)));
  }
}
