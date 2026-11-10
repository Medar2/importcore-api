import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MainSeeder } from './seeders/main.seeder';
import { Permission } from '../modules/security/entities/permission.entity';
import { Role } from '../modules/security/entities/role.entity';
import { SystemConfig } from '../modules/config/entities/system-config.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbUrl = configService.get<string>('DATABASE_URL');
        const useSsl =
          configService.get<string>('POSTGRES_SSL') === 'true' || !!dbUrl;
        return {
          type: 'postgres',
          url: dbUrl,
          host: dbUrl ? undefined : configService.get<string>('POSTGRES_HOST'),
          port: dbUrl ? undefined : configService.get<number>('POSTGRES_PORT'),
          username: dbUrl
            ? undefined
            : configService.get<string>('POSTGRES_USERNAME'),
          password: dbUrl
            ? undefined
            : configService.get<string>('POSTGRES_PASSWORD'),
          database: dbUrl
            ? undefined
            : configService.get<string>('POSTGRES_DATABASE'),
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: false, // Use migrations for database changes
          // migrationsRun: true,
          ssl: useSsl,
          extra: useSsl ? { ssl: { rejectUnauthorized: false } } : undefined,
        };
      },
    }),
    TypeOrmModule.forFeature([Permission, Role, SystemConfig]),
  ],
  providers: [MainSeeder],
})
export class DatabaseModule { }
