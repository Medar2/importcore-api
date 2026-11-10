import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../../modules/security/entities/permission.entity';
import { Role } from '../../modules/security/entities/role.entity';
import { SystemConfig } from '../../modules/config/entities/system-config.entity';

@Injectable()
export class MainSeeder implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Permission)
    private permissionRepo: Repository<Permission>,
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
    @InjectRepository(SystemConfig)
    private configRepo: Repository<SystemConfig>,
  ) {}

  async onApplicationBootstrap() {
    // 1. Seed Permissions
    const permissionsCount = await this.permissionRepo.count();
    if (permissionsCount === 0) {
      console.log('Seeding default permissions...');
      const permissions = [
        // Security
        {
          code: 'SECURITY.PERMISSIONS.CREATE',
          name: 'Create Permissions',
          module: 'SECURITY',
          resource: 'PERMISSIONS',
          action: 'CREATE',
        },
        {
          code: 'SECURITY.PERMISSIONS.LIST',
          name: 'List Permissions',
          module: 'SECURITY',
          resource: 'PERMISSIONS',
          action: 'LIST',
        },
        {
          code: 'SECURITY.ROLES.CREATE',
          name: 'Create Roles',
          module: 'SECURITY',
          resource: 'ROLES',
          action: 'CREATE',
        },
        {
          code: 'SECURITY.ROLES.LIST',
          name: 'List Roles',
          module: 'SECURITY',
          resource: 'ROLES',
          action: 'LIST',
        },
        // Subscription
        {
          code: 'SUBSCRIPTION.PLANS.CREATE',
          name: 'Create Plans',
          module: 'SUBSCRIPTION',
          resource: 'PLANS',
          action: 'CREATE',
        },
        {
          code: 'SUBSCRIPTION.PLANS.LIST',
          name: 'List Plans',
          module: 'SUBSCRIPTION',
          resource: 'PLANS',
          action: 'LIST',
        },
        // Config
        {
          code: 'CONFIG.SYSTEM.EDIT',
          name: 'Edit System Config',
          module: 'CONFIG',
          resource: 'SYSTEM',
          action: 'EDIT',
        },
      ];
      await this.permissionRepo.save(this.permissionRepo.create(permissions));
    }

    // 2. Seed Roles
    const rolesCount = await this.roleRepo.count();
    if (rolesCount === 0) {
      console.log('Seeding default roles...');
      const superAdminRole = this.roleRepo.create({
        name: 'Super Administrator',
        description: 'Full system access',
        isSystemRole: true,
      });

      const allPermissions = await this.permissionRepo.find();
      superAdminRole.permissions = allPermissions;
      await this.roleRepo.save(superAdminRole);
    }

    // 3. Seed System Config
    const configsCount = await this.configRepo.count();
    if (configsCount === 0) {
      console.log('Seeding default system configs...');
      const configs = [
        {
          key: 'SYSTEM.TIMEZONE',
          value: 'America/Santo_Domingo',
          description: 'Default system timezone',
          group: 'REGIONAL',
        },
        {
          key: 'SYSTEM.DATE_FORMAT',
          value: 'yyyy-MM-dd',
          description: 'Default date format',
          group: 'REGIONAL',
        },
        {
          key: 'SYSTEM.TIME_FORMAT',
          value: 'HH:mm:ss',
          description: 'Default time format',
          group: 'REGIONAL',
        },
        {
          key: 'SYSTEM.DATE_TIME_FORMAT',
          value: 'yyyy-MM-dd HH:mm:ss',
          description: 'Default date-time format',
          group: 'REGIONAL',
        },
        // SMTP Config
        {
          key: 'SMTP.HOST',
          value: 'smtp.gmail.com',
          description: 'SMTP server host',
          group: 'EMAIL',
        },
        {
          key: 'SMTP.PORT',
          value: '587',
          description: 'SMTP server port',
          group: 'EMAIL',
        },
        {
          key: 'SMTP.USER',
          value: '',
          description: 'SMTP server username',
          group: 'EMAIL',
        },
        {
          key: 'SMTP.PASS',
          value: '',
          description: 'SMTP server password',
          group: 'EMAIL',
        },
        {
          key: 'SMTP.FROM',
          value: 'no-reply@system.com',
          description: 'Sender email address',
          group: 'EMAIL',
        },
        {
          key: 'SMTP.SECURE',
          value: 'false',
          description: 'Use TLS/SSL',
          group: 'EMAIL',
        },
        // Storage Config
        {
          key: 'STORAGE.PROVIDER',
          value: 'LOCAL',
          description:
            'Proveedor de archivos: LOCAL, AWS, GCP, AZURE, CLOUDINARY',
          group: 'STORAGE',
        },
        {
          key: 'STORAGE.BUCKET_OR_CONTAINER',
          value: 'uploads',
          description: 'Bucket, contenedor o carpeta',
          group: 'STORAGE',
        },
        {
          key: 'STORAGE.ACCESS_KEY',
          value: '',
          description: 'Access key / API key del proveedor',
          group: 'STORAGE',
        },
        {
          key: 'STORAGE.SECRET_KEY',
          value: '',
          description: 'Secret key / API secret del proveedor',
          group: 'STORAGE',
        },
        {
          key: 'STORAGE.REGION',
          value: 'us-east-1',
          description: 'Región del proveedor (AWS/GCP/Azure)',
          group: 'STORAGE',
        },
        {
          key: 'STORAGE.PUBLIC_BASE_URL',
          value: 'http://localhost:8001',
          description: 'URL pública para servir archivos (LOCAL)',
          group: 'STORAGE',
        },
        {
          key: 'STORAGE.GCP_PROJECT_ID',
          value: '',
          description: 'Project ID de Google Cloud Storage',
          group: 'STORAGE',
        },
        {
          key: 'STORAGE.AZURE_ACCOUNT_NAME',
          value: '',
          description: 'Nombre de cuenta de Azure Blob',
          group: 'STORAGE',
        },
        {
          key: 'STORAGE.CLOUDINARY_CLOUD_NAME',
          value: '',
          description: 'Cloud name de Cloudinary',
          group: 'STORAGE',
        },
        {
          key: 'STORAGE.CLOUDINARY_API_KEY',
          value: '',
          description: 'API key de Cloudinary',
          group: 'STORAGE',
        },
        {
          key: 'STORAGE.CLOUDINARY_API_SECRET',
          value: '',
          description: 'API secret de Cloudinary',
          group: 'STORAGE',
        },
        {
          key: 'STORAGE.CLOUDINARY_UPLOAD_PRESET',
          value: '',
          description: 'Upload preset unsigned de Cloudinary',
          group: 'STORAGE',
        },
        // Validation Config
        {
          key: 'VALIDATION.CEDULA_DOMINICANA',
          value: 'true',
          description: 'Validar algoritmo de dígito verificador JCE en cédulas dominicanas',
          group: 'VALIDATION',
        },
      ];
      await this.configRepo.save(this.configRepo.create(configs));
    }
  }
}
