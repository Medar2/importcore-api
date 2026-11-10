import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Public } from '../decorators/public.decorator';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { SessionService } from '../services/session.service';

@Controller('auth')
export class DeviceLogoutController {
  constructor(private readonly sessions: SessionService) {}

  /**
   * POST /auth/logout/device — cierra solo la sesión de este dispositivo.
   * Público: el refresh token prueba la propiedad de la sesión, así funciona
   * aunque el access token (15 min) ya haya vencido.
   */
  @Public()
  @Post('logout/device')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutDevice(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.sessions.closeByRefreshToken(dto.refreshToken);
  }
}
