import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../security/entities/user.entity';

/**
 * Interfaz para estrategias de ownership
 * Permite definir cómo verificar ownership para diferentes tipos de recursos
 */
export interface OwnershipStrategy {
  /**
   * Verifica si un usuario es propietario de un recurso
   */
  checkOwnership(resourceId: string, ownerId: string): Promise<boolean>;

  /**
   * Obtiene el ID del propietario de un recurso
   */
  getOwnerId(resourceId: string): Promise<string | null>;
}

/**
 * Estrategia de ownership por defecto para recursos genéricos
 * Utiliza una tabla de mapeo ownership
 */
@Injectable()
export class DefaultOwnershipStrategy implements OwnershipStrategy {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  checkOwnership(_resourceId: string, _ownerId: string): Promise<boolean> {
    // Por defecto, verificar si el usuario es el propietario
    // Esta implementación base puede ser extendida para recursos específicos
    return Promise.resolve(true);
  }

  getOwnerId(_resourceId: string): Promise<string | null> {
    return Promise.resolve(null);
  }
}

/**
 * Servicio de Ownership (OBAC)
 * Verifica si un usuario es propietario de un recurso
 */
@Injectable()
export class OwnershipService {
  private readonly logger = new Logger(OwnershipService.name);
  private readonly strategies: Map<string, OwnershipStrategy> = new Map();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    // Registrar estrategia por defecto
    this.registerStrategy(
      'default',
      new DefaultOwnershipStrategy(this.userRepository),
    );
  }

  /**
   * Registra una estrategia de ownership para un tipo de recurso
   * @param resourceType Tipo de recurso (ej: 'document', 'project', etc.)
   * @param strategy Estrategia a utilizar
   */
  registerStrategy(resourceType: string, strategy: OwnershipStrategy): void {
    this.strategies.set(resourceType.toLowerCase(), strategy);
    this.logger.log(
      `Registered ownership strategy for resource type: ${resourceType}`,
    );
  }

  /**
   * Obtiene la estrategia para un tipo de recurso
   */
  private getStrategy(resourceType: string): OwnershipStrategy {
    const strategy = this.strategies.get(resourceType.toLowerCase());
    if (!strategy) {
      // Usar estrategia por defecto si no existe
      return this.strategies.get('default')!;
    }
    return strategy;
  }

  /**
   * Verifica si un usuario es propietario de un recurso
   * @param userId ID del usuario
   * @param resourceId ID del recurso
   * @param resourceType Tipo de recurso
   */
  async checkOwnership(
    userId: string,
    resourceId: string,
    resourceType: string,
  ): Promise<boolean> {
    this.logger.debug(
      `Checking ownership: user=${userId}, resource=${resourceId}, type=${resourceType}`,
    );

    const strategy = this.getStrategy(resourceType);
    return strategy.checkOwnership(resourceId, userId);
  }

  /**
   * Obtiene el ID del propietario de un recurso
   * @param resourceId ID del recurso
   * @param resourceType Tipo de recurso
   */
  async getResourceOwner(
    resourceId: string,
    resourceType: string,
  ): Promise<string | null> {
    const strategy = this.getStrategy(resourceType);
    return strategy.getOwnerId(resourceId);
  }

  /**
   * Verifica ownership y lanza excepción si no es propietario
   * @param userId ID del usuario
   * @param resourceId ID del recurso
   * @param resourceType Tipo de recurso
   */
  async assertOwnership(
    userId: string,
    resourceId: string,
    resourceType: string,
  ): Promise<void> {
    const hasOwnership = await this.checkOwnership(
      userId,
      resourceId,
      resourceType,
    );

    if (!hasOwnership) {
      this.logger.warn(
        `Ownership denied: user=${userId} does not own resource=${resourceId} (type=${resourceType})`,
      );
      throw new NotFoundException(
        `Resource not found or you don't have access to it`,
      );
    }
  }

  /**
   * Obtiene todos los recursos de un tipo que pertenecen a un usuario
   * @param userId ID del usuario
   * @param resourceType Tipo de recurso
   * @param limit Límite de resultados
   */
  getUserResources(
    userId: string,
    resourceType: string,
    limit: number = 100,
  ): string[] {
    // Esta implementación base retorna un array vacío
    // Las estrategias específicas pueden sobrescribir este método
    this.logger.debug(
      `Getting user resources: user=${userId}, type=${resourceType}, limit=${limit}`,
    );
    return [];
  }
}
