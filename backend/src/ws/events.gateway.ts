import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { NormalizedProfile } from '@gpt/shared';

/** Rooms are keyed by (game, platform, providerId). Platform '_' = agnostic. */
const room   = (game: string, platform: string, providerId: string) => `profile:${game}:${platform}:${providerId}`;
const lbRoom = (game: string, platform: string, metric: string)     => `lb:${game}:${platform}:${metric}`;

@WebSocketGateway({
  cors: { origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(','), credentials: true },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly log = new Logger(EventsGateway.name);
  @WebSocketServer() server!: Server;

  handleConnection(client: Socket) { this.log.verbose?.(`ws connect ${client.id}`); }
  handleDisconnect(client: Socket)  { this.log.verbose?.(`ws disconnect ${client.id}`); }

  @SubscribeMessage('subscribe:profile')
  onSubProfile(@ConnectedSocket() s: Socket, @MessageBody() body: { game: string; platform?: string; providerId: string }) {
    if (!body?.game || !body?.providerId) return;
    s.join(room(body.game, body.platform ?? '_', body.providerId));
    return { ok: true };
  }

  @SubscribeMessage('unsubscribe:profile')
  onUnsubProfile(@ConnectedSocket() s: Socket, @MessageBody() body: { game: string; platform?: string; providerId: string }) {
    if (!body?.game || !body?.providerId) return;
    s.leave(room(body.game, body.platform ?? '_', body.providerId));
    return { ok: true };
  }

  @SubscribeMessage('subscribe:leaderboard')
  onSubLb(@ConnectedSocket() s: Socket, @MessageBody() body: { game: string; platform?: string; metric: string }) {
    if (!body?.game || !body?.metric) return;
    s.join(lbRoom(body.game, body.platform ?? '_', body.metric));
    return { ok: true };
  }

  // ----- Server -> client broadcasts -----
  broadcastStatsUpdate(game: string, platform: string, providerId: string, profile: NormalizedProfile, delta: Record<string, [unknown, unknown]>) {
    this.server.to(room(game, platform, providerId)).emit('stats:updated', { game, platform, providerId, profile, delta });
  }
  broadcastRankChange(game: string, platform: string, providerId: string, oldRank?: string, newRank?: string) {
    this.server.to(room(game, platform, providerId)).emit('rank:changed', { game, platform, providerId, oldRank, newRank });
  }
  broadcastLevelUp(game: string, platform: string, providerId: string, oldLevel: number | undefined, newLevel: number) {
    this.server.to(room(game, platform, providerId)).emit('level:up', { game, platform, providerId, oldLevel, newLevel });
  }
  broadcastLeaderboardMove(game: string, platform: string, metric: string, providerId: string, oldRank: number | undefined, newRank: number) {
    this.server.to(lbRoom(game, platform, metric)).emit('leaderboard:moved', { game, platform, providerId, oldRank, newRank });
  }
  broadcastNotificationToUser(userId: string, payload: { id: string; title: string; body: string; level: 'info' | 'success' | 'warn' | 'error' }) {
    this.server.to(`user:${userId}`).emit('notification', payload);
  }
}
