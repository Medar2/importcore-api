import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from '../../security/entities/user.entity';
import { ProfileService } from '../services/profile.service';
import type { UserProfile } from '../services/profile.service';

@Controller('auth')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  /** GET /auth/me — perfil del usuario autenticado. */
  @Get('me')
  me(@CurrentUser() user: User): Promise<UserProfile> {
    return this.profile.get(user.id);
  }
}
