import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(RedisService.name);
  public readonly client: Redis;

  constructor() {
    const url = process.env.REDIS_URL ?? `redis://${process.env.REDIS_HOST ?? 'redis'}:${process.env.REDIS_PORT ?? 6379}`;
    this.client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: null });
  }

  async onModuleInit() {
    await this.client.connect();
    this.log.log('Redis connected');
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  // ---- Convenience helpers ----
  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (!raw) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const payload = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.set(key, payload, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, payload);
    }
  }

  async del(key: string) { return this.client.del(key); }

  /**
   * Try to acquire a single-holder lock. Returns true if we got it, false
   * if someone else already holds it. Always pair with `releaseLock(key)`
   * in a finally block — and pick a TTL long enough to cover the slowest
   * legitimate operation, so a crashed holder doesn't deadlock the key.
   *
   * Implementation is a vanilla `SET … NX EX` — fine for single-Redis
   * deployments; if we ever go multi-master we'd want Redlock.
   */
  async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const res = await this.client.set(key, '1', 'EX', ttlSeconds, 'NX');
    return res === 'OK';
  }

  async releaseLock(key: string): Promise<void> {
    await this.client.del(key);
  }
}
