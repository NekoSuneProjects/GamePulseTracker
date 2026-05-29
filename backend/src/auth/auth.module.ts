import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

const DEV_DEFAULT_SECRET = 'dev-secret-change-me';

/**
 * Resolve JWT_SECRET with a guard against the dev default ever shipping
 * to production. If an operator forgets to set JWT_SECRET in a prod
 * deploy, every access token would be signed with a known constant —
 * trivial forgery. Throw at boot instead.
 */
export function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production. Set a long random string in .env.');
    }
    return DEV_DEFAULT_SECRET;
  }
  if (secret === DEV_DEFAULT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is set to the dev default in production. Use a real random secret.');
  }
  return secret;
}

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: resolveJwtSecret(),
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
