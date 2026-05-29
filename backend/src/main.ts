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
 * Create a bootstrap admin user IF the users table is empty.
 *
 * GUARDS:
 *  - In production (NODE_ENV=production), refuses to auto-seed unless the
 *    operator opts in by setting BOOTSTRAP_ADMIN_ENABLED=true. Otherwise
 *    an attacker who can wipe the users table (e.g. via a leaked DB
 *    credential) can re-trigger the seed and pick up the default password.
 *  - In production, refuses to use the dev-default password. The operator
 *    must set BOOTSTRAP_ADMIN_PASSWORD explicitly.
 *  - Plaintext password is NEVER logged. The operator already knows it
 *    because they set the env var (or they ran in dev and can read the
 *    .env).
 */
async function ensureBootstrapAdmin(prisma: PrismaService, log: Logger) {
  if (process.env.BOOTSTRAP_ADMIN_DISABLED === 'true') return;

  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && process.env.BOOTSTRAP_ADMIN_ENABLED !== 'true') return;

  try {
    const count = await prisma.user.count();
    if (count > 0) return;

    const email    = process.env.BOOTSTRAP_ADMIN_EMAIL    ?? 'admin@gamepulse.local';
    const username = process.env.BOOTSTRAP_ADMIN_USERNAME ?? 'admin';
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? (isProd ? '' : 'ChangeMe!2026');

    if (isProd && !password) {
      log.error('BOOTSTRAP_ADMIN_ENABLED=true but no BOOTSTRAP_ADMIN_PASSWORD set. Refusing to create admin.');
      return;
    }

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
    log.warn(' Bootstrap admin created.');
    log.warn(`   email:    ${email}`);
    log.warn(`   username: ${username}`);
    log.warn(' Password is the value of BOOTSTRAP_ADMIN_PASSWORD (or, in dev,');
    log.warn(' the documented default). Change it via /settings → Password.');
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
