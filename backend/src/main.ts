import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const log = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { cors: false });

  const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',').map(s => s.trim()).filter(Boolean);

  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  app.setGlobalPrefix('', { exclude: ['health'] });

  const config = new DocumentBuilder()
    .setTitle('GamePulseTracker API')
    .setDescription('Multi-game player statistics and tracking platform.')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, doc);

  const port = Number(process.env.BACKEND_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  log.log(`GamePulseTracker API listening on http://0.0.0.0:${port}`);
  log.log(`Swagger docs at /docs`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
