import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../security/entities/user.entity';
import { AccessTokenPayload } from '../interfaces/token-payload.interface';
import { SessionService } from '../services/session.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly sessionService: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'default-secret-change-in-production',
      ),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<User> {
    // Buscar usuario
    const user = await this.userRepository.findOne({
      where: { id: payload.userId },
      relations: ['person', 'roles', 'organization'],
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Verificar que el usuario esté activo
    if (user.status !== 'active') {
      throw new UnauthorizedException('Usuario inactivo');
    }

    // Nota: La verificación de sesión se hace en el guard, no aquí
    // porque el access token no contiene sessionId

    return user;
  }
}
