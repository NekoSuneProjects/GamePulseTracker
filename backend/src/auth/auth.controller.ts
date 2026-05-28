import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const session = await this.auth.register(dto);
    return { ok: true, data: session };
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: { headers: Record<string, string>; ip?: string }) {
    const session = await this.auth.login(dto, req.headers['user-agent'], req.ip);
    return { ok: true, data: session };
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    const session = await this.auth.refresh(dto.refreshToken);
    return { ok: true, data: session };
  }

  @Post('logout')
  @ApiBearerAuth()
  async logout(@Body() dto: RefreshDto) {
    await this.auth.logout(dto.refreshToken);
    return { ok: true, data: null };
  }

  @Get('me')
  @ApiBearerAuth()
  async me(@CurrentUser() user: JwtPayload) {
    const data = await this.auth.me(user.sub);
    return { ok: true, data };
  }
}
