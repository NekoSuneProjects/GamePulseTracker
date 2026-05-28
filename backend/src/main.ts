import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import * as argon2 from 'argon2';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { PrismaService } from './prisma/prisma.service';

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

  await ensureBootstrapAdmin(app.get(PrismaService), log);

  const port = Number(process.env.BACKEND_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  log.log(`GamePulseTracker API listening on http://0.0.0.0:${port}`);
  log.log(`Swagger docs at /docs`);
}

/**
 * Create a bootstrap admin user IF the users table is empty. This makes
 * `docker compose up` work end-to-end without a separate seed command —
 * the operator can log straight in. Skipped on every subsequent boot.
 *
 * Credentials come from env (BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD)
 * and fall back to a known default that we log loudly so it's impossible
 * to miss in production logs. If you don't want auto-seed at all, set
 * BOOTSTRAP_ADMIN_DISABLED=true.
 */
async function ensureBootstrapAdmin(prisma: PrismaService, log: Logger) {
  if (process.env.BOOTSTRAP_ADMIN_DISABLED === 'true') return;
  try {
    const count = await prisma.user.count();
    if (count > 0) return;

    const email = process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@gamepulse.local';
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? 'ChangeMe!2026';
    const username = process.env.BOOTSTRAP_ADMIN_USERNAME ?? 'admin';
    const passwordHash = await argon2.hash(password);

    await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username,
        passwordHash,
        role: 'ADMIN',
        emailVerified: true,
      },
    });

    log.warn('================================================================');
    log.warn(' Bootstrap admin created — change the password immediately.');
    log.warn(`   email:    ${email}`);
    log.warn(`   username: ${username}`);
    log.warn(`   password: ${password}`);
    log.warn(' Set BOOTSTRAP_ADMIN_DISABLED=true to skip this on next boot.');
    log.warn('================================================================');
  } catch (e) {
    log.error(`Bootstrap admin creation failed: ${(e as Error).message}`);
    // Don't fail boot — the operator can still create a user manually via /auth/register.
  }
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
