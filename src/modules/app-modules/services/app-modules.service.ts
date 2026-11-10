import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../entities/app-module.entity';
import {
  OrganizationAppModule,
  GLOBAL_MODULE_SCOPE_ID,
} from '../entities/organization-app-module.entity';

export interface AppModuleState {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string;
  routePrefix: string | null;
  sortOrder: number;
  enabled: boolean;
  enabledByDefault: boolean;
}

@Injectable()
export class AppModulesService {
  private readonly logger = new Logger(AppModulesService.name);

  constructor(
    @InjectRepository(AppModule)
    private readonly moduleRepository: Repository<AppModule>,
    @InjectRepository(OrganizationAppModule)
    private readonly overrideRepository: Repository<OrganizationAppModule>,
  ) {}

  /**
   * Resuelve el scope de organización del usuario.
   * Usuarios sin organización (superadmin) operan sobre el scope global.
   */
  resolveScope(organizationId?: string | null): string {
    return organizationId ?? GLOBAL_MODULE_SCOPE_ID;
  }

  async findAllForScope(organizationId?: string | null): Promise<AppModuleState[]> {
    const scopeId = this.resolveScope(organizationId);

    const [modules, overrides] = await Promise.all([
      this.moduleRepository.find({ order: { sortOrder: 'ASC', name: 'ASC' } }),
      this.overrideRepository.find({ where: { organizationId: scopeId } }),
    ]);

    const overrideByModuleId = new Map(
      overrides.map((o) => [o.moduleId, o.enabled]),
    );

    return modules.map((m) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      description: m.description,
      icon: m.icon,
      category: m.category,
      routePrefix: m.routePrefix,
      sortOrder: m.sortOrder,
      enabled: overrideByModuleId.get(m.id) ?? m.enabledByDefault,
      enabledByDefault: m.enabledByDefault,
    }));
  }

  async isModuleEnabled(code: string, organizationId?: string | null): Promise<boolean> {
    const module = await this.moduleRepository.findOne({ where: { code } });
    if (!module) return false;

    const scopeId = this.resolveScope(organizationId);
    const override = await this.overrideRepository.findOne({
      where: { organizationId: scopeId, moduleId: module.id },
    });

    return override?.enabled ?? module.enabledByDefault;
  }

  /**
   * Sincroniza los overrides del scope con los módulos incluidos en un plan
   * de suscripción. Se usa al crear/activar una suscripción o cambiar de plan:
   * los módulos del plan quedan habilitados y el resto deshabilitado.
   * Los ajustes manuales posteriores se conservan hasta la próxima sync.
   */
  async syncModulesFromPlan(
    moduleCodes: string[],
    organizationId: string | null | undefined,
    userId?: string,
  ): Promise<void> {
    const scopeId = this.resolveScope(organizationId);
    const enabledSet = new Set(moduleCodes.map((c) => c.toUpperCase()));

    const modules = await this.moduleRepository.find();
    const existing = await this.overrideRepository.find({
      where: { organizationId: scopeId },
    });
    const existingByModuleId = new Map(existing.map((o) => [o.moduleId, o]));

    for (const module of modules) {
      const enabled = enabledSet.has(module.code.toUpperCase());
      const override = existingByModuleId.get(module.id);

      if (override) {
        override.enabled = enabled;
        if (userId) override.updatedBy = userId;
        await this.overrideRepository.save(override);
      } else {
        const created = this.overrideRepository.create({
          organizationId: scopeId,
          moduleId: module.id,
          enabled,
        });
        if (userId) {
          created.createdBy = userId;
          created.updatedBy = userId;
        }
        await this.overrideRepository.save(created);
      }
    }

    this.logger.log(
      `Synced ${modules.length} modules from plan for scope ${scopeId}`,
    );
  }

  async updateModuleState(
    code: string,
    enabled: boolean,
    organizationId: string | null | undefined,
    userId?: string,
  ): Promise<AppModuleState> {
    const module = await this.moduleRepository.findOne({ where: { code } });
    if (!module) {
      throw new NotFoundException(`Módulo '${code}' no encontrado`);
    }

    const scopeId = this.resolveScope(organizationId);

    let override = await this.overrideRepository.findOne({
      where: { organizationId: scopeId, moduleId: module.id },
    });

    if (override) {
      override.enabled = enabled;
      if (userId) override.updatedBy = userId;
      await this.overrideRepository.save(override);
    } else {
      override = this.overrideRepository.create({
        organizationId: scopeId,
        moduleId: module.id,
        enabled,
      });
      if (userId) {
        override.createdBy = userId;
        override.updatedBy = userId;
      }
      await this.overrideRepository.save(override);
    }

    this.logger.log(
      `Module ${code} ${enabled ? 'enabled' : 'disabled'} for scope ${scopeId} by ${userId ?? 'unknown'}`,
    );

    return {
      id: module.id,
      code: module.code,
      name: module.name,
      description: module.description,
      icon: module.icon,
      category: module.category,
      routePrefix: module.routePrefix,
      sortOrder: module.sortOrder,
      enabled,
      enabledByDefault: module.enabledByDefault,
    };
  }
}
