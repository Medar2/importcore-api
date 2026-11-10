import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { RateLimitService } from './services/rate-limit.service';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 segundo
        limit: 3, // 3 requests por segundo
      },
      {
        name: 'medium',
        ttl: 10000, // 10 segundos
        limit: 20, // 20 requests por 10 segundos
      },
      {
        name: 'long',
        ttl: 60000, // 1 minuto
        limit: 100, // 100 requests por minuto
      },
    ]),
  ],
  providers: [RateLimitGuard, RateLimitService],
  exports: [RateLimitGuard, RateLimitService],
})
export class RateLimitModule {}
