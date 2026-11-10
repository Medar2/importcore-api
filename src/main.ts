import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger stays out of the free-tier production process: generating the
  // document loads the whole DTO graph and pushes the instance over 512 MiB.
  const enableSwagger =
    process.env.ENABLE_SWAGGER === 'true' ||
    process.env.NODE_ENV !== 'production';

  if (enableSwagger) {
    const { SwaggerModule, DocumentBuilder } = await import('@nestjs/swagger');
    const config = new DocumentBuilder()
      .setTitle('ImportCore RD API')
      .setDescription(
        'ERP de importacion por encargo - Todo Import RD. Plataforma RBAC, landed cost, logistica y fiscalidad DGII.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  app.enableCors();

  const port = Number(process.env.PORT || process.env.APP_PORT || 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://0.0.0.0:${port}/api`);
  if (enableSwagger) {
    console.log(`Swagger documentation: http://0.0.0.0:${port}/docs`);
  }
}
void bootstrap();
