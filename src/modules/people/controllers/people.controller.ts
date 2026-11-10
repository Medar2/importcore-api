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
import { PeopleService } from '../services/people.service';
import { CreatePersonDto } from '../dtos/create-person.dto';
import { UpdatePersonDto } from '../dtos/update-person.dto';
import { ListPeopleQueryDto } from '../dtos/list-people-query.dto';

@Controller('people')
@RequireModule('PERSONAS')
@UseGuards(JwtAuthGuard, PermissionsGuard, ModuleAccessGuard)
export class PeopleController {
  constructor(private readonly peopleService: PeopleService) {}

  @Get()
  @RequirePermission('PEOPLE.READ')
  async listPeople(@Query() query: ListPeopleQueryDto, @Req() req: any) {
    const data = await this.peopleService.listPeople(
      query,
      req.user?.organizationId,
    );
    return { success: true, ...data };
  }

  @Get('search/by-identity/:idNumber')
  @RequirePermission('PEOPLE.READ')
  async searchByIdentity(@Param('idNumber') idNumber: string) {
    const person = await this.peopleService.searchByIdentity(idNumber);
    return { success: true, data: person };
  }

  @Get(':id')
  @RequirePermission('PEOPLE.READ')
  async getPerson(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.peopleService.getPerson(id);
    return { success: true, data };
  }

  @Post()
  @RequirePermission('PEOPLE.WRITE')
  async createPerson(@Body() dto: CreatePersonDto, @Req() req: any) {
    const data = await this.peopleService.createPerson(
      dto,
      req.user?.organizationId,
      req.user?.id,
    );
    return { success: true, data, message: 'Persona registrada exitosamente' };
  }

  @Put(':id')
  @RequirePermission('PEOPLE.WRITE')
  async updatePerson(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePersonDto,
    @Req() req: any,
  ) {
    const data = await this.peopleService.updatePerson(
      id,
      dto,
      req.user?.organizationId,
      req.user?.id,
    );
    return { success: true, data, message: 'Persona actualizada exitosamente' };
  }

  @Delete(':id')
  @RequirePermission('PEOPLE.DELETE')
  async deletePerson(@Param('id', ParseUUIDPipe) id: string) {
    return await this.peopleService.deletePerson(id);
  }
}
