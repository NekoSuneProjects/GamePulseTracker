import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bull';

import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConnectionsModule } from './connections/connections.module';
import { GamesModule } from './games/games.module';
import { StatsModule } from './stats/stats.module';
import { LeaderboardsModule } from './leaderboards/leaderboards.module';
import { QueueModule } from './queue/queue.module';
import { WsModule } from './ws/ws.module';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PublicApiModule } from './public-api/public-api.module';
import { IntegrationsModule } from './games/integrations/integrations.module';
import { NewsModule } from './news/news.module';
import { IngestModule } from './ingest/ingest.module';
import { DeletionRequestsModule } from './deletion-requests/deletion-requests.module';
import { FavoritesModule } from './favorites/favorites.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { SocialModule } from './social/social.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../.env'] }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 20 },
      { name: 'long',  ttl: 60_000, limit: 300 },
    ]),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST ?? 'redis',
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
    }),
    PrismaModule,
    RedisModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ConnectionsModule,
    IntegrationsModule,
    GamesModule,
    StatsModule,
    LeaderboardsModule,
    QueueModule,
    WsModule,
    AdminModule,
    NotificationsModule,
    PublicApiModule,
    NewsModule,
    IngestModule,
    DeletionRequestsModule,
    FavoritesModule,
    ApiKeysModule,
    SocialModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
