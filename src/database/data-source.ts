import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const isCompiled = __filename.endsWith('.js');

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  host: process.env.DATABASE_URL ? undefined : process.env.POSTGRES_HOST,
  port: process.env.DATABASE_URL
    ? undefined
    : parseInt(process.env.POSTGRES_PORT || '5432'),
  username: process.env.DATABASE_URL
    ? undefined
    : process.env.POSTGRES_USERNAME,
  password: process.env.DATABASE_URL
    ? undefined
    : process.env.POSTGRES_PASSWORD,
  database: process.env.DATABASE_URL
    ? undefined
    : process.env.POSTGRES_DATABASE,
  entities: isCompiled ? ['dist/**/*.entity.js'] : ['src/**/*.entity.ts'],
  migrations: isCompiled
    ? ['dist/**/migrations/*.js']
    : ['src/database/migrations/*.ts'],
  synchronize: false,
  ssl: process.env.POSTGRES_SSL === 'true' || !!process.env.DATABASE_URL,
  extra:
    process.env.POSTGRES_SSL === 'true' || !!process.env.DATABASE_URL
      ? { ssl: { rejectUnauthorized: false } }
      : undefined,
});
