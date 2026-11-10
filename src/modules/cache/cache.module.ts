import { Module, Global, Logger } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('CacheModule');
        const redisUrl = configService.get<string>('REDIS_URL');
        const redisHost = configService.get<string>('REDIS_HOST');
        const redisPort = configService.get<number>('REDIS_PORT');
        const redisPassword = configService.get<string>('REDIS_PASSWORD');

        try {
          let store;
          if (redisUrl) {
            store = await redisStore({
              url: redisUrl,
              ttl: 3600000, // 1 hour default TTL
            });
          } else if (redisHost) {
            store = await redisStore({
              socket: {
                host: redisHost,
                port: redisPort,
              },
              password: redisPassword,
              ttl: 3600000,
            });
          } else {
            throw new Error('No Redis URL or Host provided.');
          }

          return { store };
        } catch (error) {
          logger.error(
            `Failed to connect to Redis: ${error.message}. Falling back to in-memory cache.`,
          );
          return {
            ttl: 3600000,
          };
        }
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheService, NestCacheModule],
})
export class CacheModule {}
