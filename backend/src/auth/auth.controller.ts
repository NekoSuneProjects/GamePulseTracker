import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { TotpService } from './totp.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

class TotpCodeDto { @IsString() @MinLength(6) code!: string; }
class TotpDisableDto { @IsString() password!: string; }

@ApiTags('auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private auth: AuthService, private totp: TotpService) {}

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

  // ---------- 2FA TOTP ----------

  /** Start enrolment — returns an otpauth URL the UI renders as a QR code. */
  @Post('totp/enroll')
  @ApiBearerAuth()
  async totpEnroll(@CurrentUser() user: JwtPayload) {
    return { ok: true, data: await this.totp.enroll(user.sub) };
  }

  /** Verify a code; first successful verify flips totpEnabled. */
  @Post('totp/verify')
  @ApiBearerAuth()
  async totpVerify(@CurrentUser() user: JwtPayload, @Body() dto: TotpCodeDto) {
    return { ok: true, data: await this.totp.verify(user.sub, dto.code) };
  }

  /** Disable 2FA — password confirmation required. */
  @Post('totp/disable')
  @ApiBearerAuth()
  async totpDisable(@CurrentUser() user: JwtPayload, @Body() dto: TotpDisableDto) {
    return { ok: true, data: await this.totp.disable(user.sub, dto.password) };
  }
}
