import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../entities/permission.entity';
import { CreatePermissionDto } from '../dto/security-management.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
  ) {}

  async create(createPermissionDto: CreatePermissionDto) {
    const permission = this.permissionRepository.create(createPermissionDto);
    return this.permissionRepository.save(permission);
  }

  async findAll() {
    return this.permissionRepository.find();
  }

  async findOne(id: string) {
    const permission = await this.permissionRepository.findOne({
      where: { id },
    });
    if (!permission) throw new NotFoundException('Permission not found');
    return permission;
  }
}
