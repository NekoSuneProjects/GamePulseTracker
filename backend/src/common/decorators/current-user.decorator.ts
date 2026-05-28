import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  username: string;
  role: Role;
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtPayload => ctx.switchToHttp().getRequest().user,
);
