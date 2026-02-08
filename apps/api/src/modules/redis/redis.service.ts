import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD', ''),
      db: this.configService.get<number>('REDIS_DB', 0),
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 2) return null;
        return Math.min(times * 100, 500);
      },
    });

    // 연결 에러를 무시하고 계속 진행
    this.client.on('error', (err) => {
      console.warn('[Redis] Connection error (will continue without Redis):', err.message);
    });

    // 연결 시도 (실패해도 앱은 계속 실행)
    try {
      await this.client.connect();
      console.log('[Redis] Connected successfully');
    } catch (error) {
      console.warn('[Redis] Failed to connect, continuing without Redis');
    }
  }

  async onModuleDestroy() {
    if (this.isConnected()) {
      try {
        await this.client.quit();
      } catch (error) {
        // Silent fail
      }
    }
  }

  getClient(): Redis {
    return this.client;
  }

  private isConnected(): boolean {
    return this.client && this.client.status === 'ready';
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected()) return null;
    try {
      return await this.client.get(key);
    } catch (error) {
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.isConnected()) return;
    try {
      if (ttl) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      // Silent fail
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected()) return;
    try {
      await this.client.del(key);
    } catch (error) {
      // Silent fail
    }
  }

  async incr(key: string): Promise<number> {
    if (!this.isConnected()) return 0;
    try {
      return await this.client.incr(key);
    } catch (error) {
      return 0;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.isConnected()) return;
    try {
      await this.client.expire(key, seconds);
    } catch (error) {
      // Silent fail
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected()) return false;
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    if (!this.isConnected()) return -1;
    try {
      return await this.client.ttl(key);
    } catch (error) {
      return -1;
    }
  }

  async zRemRangeByScore(key: string, min: number, max: number): Promise<number> {
    if (!this.isConnected()) return 0;
    try {
      return await this.client.zremrangebyscore(key, min, max);
    } catch (error) {
      return 0;
    }
  }

  async zCount(key: string, min: number, max: number): Promise<number> {
    if (!this.isConnected()) return 0;
    try {
      return await this.client.zcount(key, min, max);
    } catch (error) {
      return 0;
    }
  }

  async zAdd(key: string, items: Array<{ score: number; value: string }>): Promise<number> {
    if (!this.isConnected()) return 0;
    try {
      const args = items.flatMap(item => [item.score, item.value]);
      return await this.client.zadd(key, ...args);
    } catch (error) {
      return 0;
    }
  }
}
