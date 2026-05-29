import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../ws/events.gateway';
import type { IngestPayload, NormalizedProfile } from '@gpt/shared';

@Injectable()
export class IngestService {
  private readonly log = new Logger(IngestService.name);

  constructor(private prisma: PrismaService, private gateway: EventsGateway) {}

  /**
   * Accept an ingested payload for `game` from a paired device.
   * Validates ownership (deviceId), normalises platform, persists snapshot,
   * appends matches, and broadcasts a stats:updated event over WS.
   */
  async accept(deviceId: string, payload: IngestPayload) {
    if (!payload?.game || !payload?.providerId) {
      throw new BadRequestException({ code: 'INVALID_INGEST', message: 'game and providerId are required' });
    }

    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device || device.revokedAt) {
      throw new ForbiddenException({ code: 'DEVICE_REVOKED', message: 'device not active' });
    }
    // Empty scopes[] now means "no permissions", not "all games" — flipped
    // because the previous default + the pairing flow's blank scopes meant
    // ANY paired device could ingest for ANY game. Now devices must be
    // explicitly granted each game (set scopes=['*'] for all-access).
    const scopes = (device.scopes as string[]) ?? [];
    const allGames = scopes.includes('*');
    if (!allGames && !scopes.includes(payload.game)) {
      throw new ForbiddenException({
        code: 'SCOPE_DENIED',
        message: `device cannot ingest ${payload.game}. Add ${payload.game} (or '*' for all games) to the device's scopes.`,
      });
    }

    const platform = (payload.platform ?? '_').trim() || '_';

    // Block hijack: a TrackedProfile that already belongs to a DIFFERENT user
    // must not be re-attributed by another user's device just by POSTing the
    // same providerId. Read first; if owned by someone else, refuse.
    const existing = await this.prisma.trackedProfile.findUnique({
      where: { game_platform_providerId: { game: payload.game, platform, providerId: payload.providerId } },
      select: { userId: true },
    });
    if (existing?.userId && existing.userId !== device.userId) {
      throw new ForbiddenException({
        code: 'PROFILE_OWNED_BY_OTHER_USER',
        message: 'This tracked profile already belongs to another user. Have them unlink it first, or use a different providerId.',
      });
    }

    const snapshot: NormalizedProfile = {
      game: payload.game,
      providerId: payload.providerId,
      displayName: payload.displayName ?? payload.providerId,
      platform,
      headline: payload.snapshot?.headline ?? {},
      details: payload.snapshot?.details ?? {},
      recent: payload.snapshot?.recent,
      seasons: payload.snapshot?.seasons,
      avatarUrl: payload.snapshot?.avatarUrl,
      providerUpdatedAt: payload.capturedAt,
      fetchedAt: new Date().toISOString(),
    };

    const profile = await this.prisma.trackedProfile.upsert({
      where: { game_platform_providerId: { game: payload.game, platform, providerId: payload.providerId } },
      update: {
        userId: device.userId,
        displayName: snapshot.displayName,
        platform,
        avatarUrl: snapshot.avatarUrl,
        latestSnapshot: snapshot as unknown as object,
        providerUpdatedAt: payload.capturedAt ? new Date(payload.capturedAt) : null,
        lastFetchedAt: new Date(),
        lastAttemptedAt: new Date(),
      },
      create: {
        userId: device.userId,
        game: payload.game,
        platform,
        providerId: payload.providerId,
        displayName: snapshot.displayName,
        avatarUrl: snapshot.avatarUrl,
        latestSnapshot: snapshot as unknown as object,
        providerUpdatedAt: payload.capturedAt ? new Date(payload.capturedAt) : null,
        lastFetchedAt: new Date(),
        lastAttemptedAt: new Date(),
      },
    });

    await this.prisma.statSnapshot.create({
      data: {
        profileId: profile.id,
        payload: snapshot as object,
        level:    pickNum(snapshot.headline.level),
        xp:       pickBig(snapshot.headline.xp),
        rank:     pickStr(snapshot.headline.rank),
        rankTier: pickNum(snapshot.headline.rankTier),
        kd:       pickFloat(snapshot.headline.kd),
        wins:     pickNum(snapshot.headline.wins),
        losses:   pickNum(snapshot.headline.losses),
        matches:  pickNum(snapshot.headline.matches),
      },
    });

    if (payload.matches?.length) {
      for (const m of payload.matches) {
        await this.prisma.matchRecord.upsert({
          where: { profileId_matchId: { profileId: profile.id, matchId: m.matchId } },
          update: {
            playedAt: new Date(m.playedAt),
            mode: m.mode ?? null, map: m.map ?? null, result: m.result ?? null,
            kills: m.kills ?? null, deaths: m.deaths ?? null, assists: m.assists ?? null,
            score: m.score ?? null, durationSec: m.durationSec ?? null, details: m.details ?? undefined,
          },
          create: {
            profileId: profile.id, matchId: m.matchId,
            playedAt: new Date(m.playedAt),
            mode: m.mode, map: m.map, result: m.result,
            kills: m.kills, deaths: m.deaths, assists: m.assists,
            score: m.score, durationSec: m.durationSec, details: m.details ?? undefined,
          },
        }).catch((e) => this.log.warn(`match upsert failed: ${(e as Error).message}`));
      }
    }

    await this.prisma.ingestEvent.create({
      data: { deviceId: device.id, game: payload.game, platform, providerId: payload.providerId, payload: payload as unknown as object },
    });

    this.gateway.broadcastStatsUpdate(payload.game, platform, payload.providerId, snapshot, {});

    // Forward structured events (level:up, rank:changed, match:end) via WS.
    for (const ev of payload.events ?? []) {
      if (ev.type === 'level:up') {
        this.gateway.broadcastLevelUp(payload.game, platform, payload.providerId, ev.payload.oldLevel, ev.payload.newLevel);
      } else if (ev.type === 'rank:changed') {
        this.gateway.broadcastRankChange(payload.game, platform, payload.providerId, ev.payload.oldRank, ev.payload.newRank);
      }
    }

    return profile;
  }
}

function pickNum(v: unknown):   number | null { return typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : null; }
function pickFloat(v: unknown): number | null { return typeof v === 'number' && Number.isFinite(v) ? v : null; }
function pickBig(v: unknown):   bigint | null { return typeof v === 'number' && Number.isFinite(v) ? BigInt(Math.trunc(v)) : null; }
function pickStr(v: unknown):   string | null { return typeof v === 'string' ? v : null; }
