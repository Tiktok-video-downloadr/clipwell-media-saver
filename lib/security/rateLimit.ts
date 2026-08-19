import type Redis from "ioredis";

export interface RateLimitConfig {
  windowSeconds: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAtSeconds: number;
}

export class RateLimiter {
  constructor(private redis: Redis) {}

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const bucketKey = `ratelimit:${key}:${Math.floor(
      Date.now() / 1000 / config.windowSeconds
    )}`;

    const count = await this.redis.incr(bucketKey);
    if (count === 1) {
      await this.redis.expire(bucketKey, config.windowSeconds);
    }

    const ttl = await this.redis.ttl(bucketKey);
    return {
      allowed: count <= config.maxRequests,
      remaining: Math.max(0, config.maxRequests - count),
      resetAtSeconds: ttl > 0 ? ttl : config.windowSeconds,
    };
  }

  async acquireConcurrencySlot(key: string, max: number): Promise<boolean> {
    const slotKey = `concurrency:${key}`;
    const current = await this.redis.incr(slotKey);
    if (current === 1) {
      await this.redis.expire(slotKey, 60 * 30);
    }
    if (current > max) {
      await this.redis.decr(slotKey);
      return false;
    }
    return true;
  }

  async releaseConcurrencySlot(key: string): Promise<void> {
    const slotKey = `concurrency:${key}`;
    const remaining = await this.redis.decr(slotKey);
    if (remaining <= 0) {
      await this.redis.del(slotKey);
    }
  }
}

export const RATE_LIMIT_POLICIES = {
  perIpPerMinute: { windowSeconds: 60, maxRequests: 20 } satisfies RateLimitConfig,
  perAccountPerMinute: { windowSeconds: 60, maxRequests: 40 } satisfies RateLimitConfig,
  perIpConcurrentJobs: 3,
  perAccountConcurrentJobs: 8,
};
