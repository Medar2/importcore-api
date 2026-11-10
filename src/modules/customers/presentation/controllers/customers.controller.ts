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
import { CustomersService } from '../../application/services/customers.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
} from '../dtos/customer.dto';
import { Customer } from '../../entities/customer.entity';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Post()
  @RequirePermission('IMPORTCORE.CUSTOMERS.WRITE')
  create(@Body() dto: CreateCustomerDto): Promise<Customer> {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('IMPORTCORE.CUSTOMERS.READ')
  findAll(@Query('all') all?: string): Promise<Customer[]> {
    return this.service.findAll(all !== 'true');
  }

  @Get(':id')
  @RequirePermission('IMPORTCORE.CUSTOMERS.READ')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Customer> {
    return this.service.findById(id);
  }

  @Patch(':id')
  @RequirePermission('IMPORTCORE.CUSTOMERS.WRITE')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ): Promise<Customer> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('IMPORTCORE.CUSTOMERS.WRITE')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.remove(id);
  }
}
