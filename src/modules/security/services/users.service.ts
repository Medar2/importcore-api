import {
  Injectable,
  Inject,
  forwardRef,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { PeopleService } from '../../people/services/people.service';
import { RBACService } from '../../rbac/services/rbac.service';
import { CreateUserDto, UpdateUserDto } from '../dto/users.dto';
import { IdentityType } from '../../people/entities/people.enums';
import { Person } from '../../people/entities/person.entity';
import { JwtTokenService } from '../../auth/services/jwt-token.service';
import { EmailService } from '../../notification/services/email.service';
import { AuditService } from '../../audit/services/audit.service';
import { AuditActor } from './roles.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Person)
    private personRepository: Repository<Person>,
    private peopleService: PeopleService,
    private rbacService: RBACService,
    private dataSource: DataSource,
    @Inject(forwardRef(() => JwtTokenService))
    private jwtTokenService: JwtTokenService,
    private emailService: EmailService,
    private auditService: AuditService,
  ) { }

  async findAll() {
    try {
      this.logger.log('Fetching all users with person data...');
      const users = await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.person', 'person')
        .leftJoinAndSelect('person.addresses', 'address')
        .leftJoinAndSelect('user.roles', 'role')
        .leftJoinAndSelect('user.organization', 'organization')
        .orderBy('user.createdAt', 'DESC')
        .getMany();

      this.logger.log(`Found ${users.length} users`);
      return users;
    } catch (error) {
      this.logger.error(`Error fetching users: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.person', 'person')
      .leftJoinAndSelect('person.addresses', 'address')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('user.organization', 'organization')
      .where('user.id = :id', { id })
      .getOne();

    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async create(dto: CreateUserDto, actor?: AuditActor) {
    const {
      personId,
      email,
      password,
      roles,
      activo,
      username: customUsername,
      nombre,
      apellido,
    } = dto;

    let targetPerson: Person;

    if (personId) {
      // 1. Validar que la persona exista en el catálogo de personas
      const foundPerson = await this.personRepository.findOne({
        where: { id: personId },
      });
      if (!foundPerson) {
        throw new NotFoundException(
          'La persona/empleado seleccionado no existe en el catálogo',
        );
      }

      // 2. Verificar que la persona no tenga ya un usuario asignado
      const existingUser = await this.userRepository.findOne({
        where: { personId },
      });
      if (existingUser) {
        throw new ConflictException(
          `La persona "${foundPerson.firstName} ${foundPerson.lastName || ''}". ya tiene una cuenta de usuario asignada (${existingUser.username})`,
        );
      }

      // 3. Asegurar que la persona tenga el rol 'EMPLOYEE' en su catálogo de personas
      const currentRoles = Array.isArray(foundPerson.roles)
        ? foundPerson.roles
        : typeof foundPerson.roles === 'string'
          ? (foundPerson.roles as string).split(',')
          : [];

      if (!currentRoles.includes('EMPLOYEE')) {
        foundPerson.roles = [...currentRoles, 'EMPLOYEE'];
        await this.personRepository.save(foundPerson);
      }

      targetPerson = foundPerson;
    } else if (email) {
      // Fallback: Si no viene personId pero viene email/nombre
      const existingPerson = await this.peopleService.findByEmail(email);
      if (existingPerson) {
        const existingUser = await this.userRepository.findOne({
          where: { personId: existingPerson.id },
        });
        if (existingUser) {
          throw new ConflictException(
            'El email ya está asociado a un usuario registrado',
          );
        }
        targetPerson = existingPerson;
      } else {
        // Crear la persona como empleado
        targetPerson = await this.personRepository.save(
          this.personRepository.create({
            firstName: (nombre || 'Usuario').trim(),
            lastName: (apellido || '').trim(),
            email: email.trim().toLowerCase(),
            identityType: IdentityType.CEDULA,
            roles: ['EMPLOYEE'],
            status: 'active',
          }),
        );
      }
    } else {
      throw new BadRequestException(
        'Debe seleccionar un empleado/persona registrado',
      );
    }

    // 4. Determinar username
    const username = (
      customUsername?.trim() ||
      targetPerson.email?.trim() ||
      targetPerson.identityNumber?.trim() ||
      `${targetPerson.firstName.toLowerCase()}.${Date.now().toString().slice(-4)}`
    ).toLowerCase();

    // Verificar unicidad de username
    const userWithSameUsername = await this.userRepository.findOne({
      where: { username },
    });
    if (userWithSameUsername) {
      throw new ConflictException(
        `El nombre de usuario "${username}" ya está en uso. Por favor elija otro nombre de usuario.`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 5. Crear Usuario
      const salt = await bcrypt.genSalt();
      const passwordHash = await bcrypt.hash(password, salt);

      const user = queryRunner.manager.create(User, {
        username,
        passwordHash,
        personId: targetPerson.id,
        status: activo !== false ? 'active' : 'inactive',
      });

      // Asignar roles si se proporcionan
      if (roles && roles.length > 0) {
        const rolesEntities = await this.rbacService.getRolesByIds(roles);
        user.roles = rolesEntities;
      }

      const savedUser = await queryRunner.manager.save(user);
      await queryRunner.commitTransaction();

      const createdUser = await this.findOne(savedUser.id);

      // Auditoría: Quién creó a qué usuario
      if (actor) {
        await this.auditService.logAccess({
          userId: actor.id || 'system',
          userEmail: actor.email || 'system',
          action: 'USER_CREATED',
          resource: 'USER',
          resourceId: createdUser.id,
          result: 'success',
          metadata: {
            targetUserId: createdUser.id,
            targetUsername: createdUser.username,
            targetEmail: createdUser.person?.email,
            targetFullName: `${createdUser.person?.firstName || ''} ${createdUser.person?.lastName || ''}`.trim(),
            assignedRoles: createdUser.roles?.map((r) => r.name) || [],
            status: createdUser.status,
          },
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        });
      }

      return createdUser;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: string, dto: UpdateUserDto, actor?: AuditActor) {
    const user = await this.findOne(id);
    const { roles, activo, password, username, email, nombre, apellido } = dto;

    const previousRoles = user.roles?.map((r) => r.name) || [];
    const previousStatus = user.status;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Actualizar vinculación de persona si cambia
      if (dto.personId && dto.personId !== user.personId) {
        const foundPerson = await this.personRepository.findOne({
          where: { id: dto.personId },
        });
        if (!foundPerson) {
          throw new NotFoundException(
            'La persona/empleado seleccionado no existe en el catálogo',
          );
        }
        user.personId = dto.personId;
        user.person = foundPerson;
      }

      // 2. Actualizar Datos de Persona si se envían
      if (user.personId && (nombre || apellido || email)) {
        const personUpdate: any = {};
        if (nombre) personUpdate.firstName = nombre.trim();
        if (apellido !== undefined) personUpdate.lastName = apellido.trim();
        if (email) personUpdate.email = email.trim().toLowerCase();
        await queryRunner.manager.update(Person, user.personId, personUpdate);
      }

      // 3. Actualizar Usuario
      if (activo !== undefined) {
        user.status = activo ? 'active' : 'inactive';
      }

      if (username?.trim() && username.trim() !== user.username) {
        const existing = await this.userRepository.findOne({
          where: { username: username.trim().toLowerCase() },
        });
        if (existing && existing.id !== id) {
          throw new ConflictException(
            `El nombre de usuario "${username}" ya está en uso.`,
          );
        }
        user.username = username.trim().toLowerCase();
      }

      if (password?.trim()) {
        const salt = await bcrypt.genSalt();
        user.passwordHash = await bcrypt.hash(password.trim(), salt);
      }

      if (roles) {
        const rolesEntities = await this.rbacService.getRolesByIds(roles);
        user.roles = rolesEntities;
      }

      await queryRunner.manager.save(user);
      await queryRunner.commitTransaction();

      const updatedUser = await this.findOne(id);
      const newRoles = updatedUser.roles?.map((r) => r.name) || [];

      // Auditoría: Quién editó a qué usuario
      if (actor) {
        await this.auditService.logAccess({
          userId: actor.id || 'system',
          userEmail: actor.email || 'system',
          action: 'USER_UPDATED',
          resource: 'USER',
          resourceId: id,
          result: 'success',
          metadata: {
            targetUserId: id,
            targetUsername: updatedUser.username,
            targetEmail: updatedUser.person?.email,
            targetFullName: `${updatedUser.person?.firstName || ''} ${updatedUser.person?.lastName || ''}`.trim(),
            rolesBefore: previousRoles,
            rolesAfter: newRoles,
            statusBefore: previousStatus,
            statusAfter: updatedUser.status,
            passwordChanged: Boolean(password?.trim()),
          },
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
        });
      }

      return updatedUser;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string, actor?: AuditActor) {
    const user = await this.findOne(id);
    user.status = 'inactive';
    await this.userRepository.save(user);

    if (actor) {
      await this.auditService.logAccess({
        userId: actor.id || 'system',
        userEmail: actor.email || 'system',
        action: 'USER_DEACTIVATED',
        resource: 'USER',
        resourceId: id,
        result: 'success',
        metadata: {
          targetUserId: id,
          targetUsername: user.username,
          targetEmail: user.person?.email,
        },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });
    }

    return { success: true, message: 'Usuario desactivado correctamente' };
  }

  async setStatus(id: string, activeOrStatus: boolean | 'active' | 'inactive', actor?: AuditActor) {
    const user = await this.findOne(id);
    const oldStatus = user.status;
    if (typeof activeOrStatus === 'boolean') {
      user.status = activeOrStatus ? 'active' : 'inactive';
    } else {
      user.status = activeOrStatus;
    }
    const saved = await this.userRepository.save(user);

    if (actor) {
      await this.auditService.logAccess({
        userId: actor.id || 'system',
        userEmail: actor.email || 'system',
        action: 'USER_STATUS_CHANGED',
        resource: 'USER',
        resourceId: id,
        result: 'success',
        metadata: {
          targetUserId: id,
          targetUsername: user.username,
          targetEmail: user.person?.email,
          previousStatus: oldStatus,
          newStatus: saved.status,
        },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });
    }

    return saved;
  }

  async changePassword(id: string, newPassword: string, actor?: AuditActor) {
    const user = await this.findOne(id);
    const salt = await bcrypt.genSalt();
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await this.userRepository.save(user);

    if (actor) {
      await this.auditService.logAccess({
        userId: actor.id || 'system',
        userEmail: actor.email || 'system',
        action: 'PASSWORD_CHANGED',
        resource: 'USER',
        resourceId: id,
        result: 'success',
        metadata: {
          targetUserId: id,
          targetUsername: user.username,
          targetEmail: user.person?.email,
        },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });
    }

    return user;
  }

  async assignRole(userId: string, roleId: string, actor?: AuditActor) {
    const user = await this.findOne(userId);
    const roles = user.roles || [];
    if (!roles.some((r) => r.id === roleId)) {
      const [role] = await this.rbacService.getRolesByIds([roleId]);
      if (role) {
        user.roles = [...roles, role];
        const saved = await this.userRepository.save(user);

        if (actor) {
          await this.auditService.logAccess({
            userId: actor.id || 'system',
            userEmail: actor.email || 'system',
            action: 'ROLE_ASSIGNED',
            resource: 'USER',
            resourceId: userId,
            result: 'success',
            metadata: {
              targetUserId: userId,
              targetUsername: user.username,
              targetEmail: user.person?.email,
              roleId,
              roleName: role.name,
            },
            ipAddress: actor.ipAddress,
            userAgent: actor.userAgent,
          });
        }

        return saved;
      }
    }
    return user;
  }

  async removeRole(userId: string, roleId: string, actor?: AuditActor) {
    const user = await this.findOne(userId);
    const removedRole = (user.roles || []).find((r) => r.id === roleId);
    user.roles = (user.roles || []).filter((r) => r.id !== roleId);
    const saved = await this.userRepository.save(user);

    if (actor && removedRole) {
      await this.auditService.logAccess({
        userId: actor.id || 'system',
        userEmail: actor.email || 'system',
        action: 'ROLE_REVOKED',
        resource: 'USER',
        resourceId: userId,
        result: 'success',
        metadata: {
          targetUserId: userId,
          targetUsername: user.username,
          targetEmail: user.person?.email,
          roleId,
          roleName: removedRole.name,
        },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });
    }

    return saved;
  }

  async sendPasswordResetLink(userId: string, actor?: AuditActor) {
    const user = await this.findOne(userId);
    const email =
      user.person?.email ||
      (user.username.includes('@') ? user.username : null);

    if (!email) {
      throw new BadRequestException(
        `El usuario "${user.username}" no tiene un correo electrónico válido configurado para recibir el enlace.`,
      );
    }

    const resetToken = await this.jwtTokenService.generatePasswordResetToken(
      user.id,
      email,
    );
    const userName =
      [user.person?.firstName, user.person?.lastName]
        .filter(Boolean)
        .join(' ') || user.username;

    await this.emailService.sendPasswordResetEmail(email, resetToken, userName);

    if (actor) {
      await this.auditService.logAccess({
        userId: actor.id || 'system',
        userEmail: actor.email || 'system',
        action: 'PASSWORD_RESET_REQUESTED',
        resource: 'USER',
        resourceId: userId,
        result: 'success',
        metadata: {
          targetUserId: userId,
          targetUsername: user.username,
          targetEmail: email,
        },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });
    }

    return {
      success: true,
      message: `Enlace de recuperación enviado exitosamente al correo ${email}`,
      email,
    };
  }
}
