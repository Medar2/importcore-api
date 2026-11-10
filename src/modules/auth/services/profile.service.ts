import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../security/entities/user.entity';

export interface UserProfile {
  id: string;
  username: string;
  email: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: string;
  isSuperAdmin: boolean;
  mfaEnabled: boolean;
  emailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  organization: { id: string; name: string } | null;
  roles: { id: string; name: string; description: string | null; color: string | null }[];
}

/** Perfil del usuario autenticado, sin secretos (hash, MFA). */
@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async get(userId: string): Promise<UserProfile> {
    const user = await this.users.findOne({
      where: { id: userId },
      relations: ['person', 'roles', 'organization'],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const person = user.person;
    return {
      id: user.id,
      username: user.username,
      email: person?.email ?? null,
      firstName: person?.firstName ?? '',
      lastName: person?.lastName ?? '',
      phone: person?.mobilePhone || person?.phoneNumber || null,
      status: user.status,
      isSuperAdmin: user.isSuperAdmin,
      mfaEnabled: user.mfaEnabled,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt ?? null,
      createdAt: user.createdAt,
      organization: user.organization
        ? { id: user.organization.id, name: user.organization.name }
        : null,
      roles: (user.roles ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description ?? null,
        color: r.color ?? null,
      })),
    };
  }
}
