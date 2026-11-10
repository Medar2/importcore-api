import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Verificar si la ruta es pública
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Llamar al guard de Passport para validar el JWT
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, _info: any) {
    // Si hay un error o no hay usuario, lanzar excepción
    if (err || !user) {
      throw err || new UnauthorizedException('Token inválido o expirado');
    }

    return user;
  }
}
