import { Ratelimit } from '@upstash/ratelimit';
import { getRedis } from './redis.js';

let limiter;
export function getLimiter() {
  if (limiter !== undefined) return limiter;
  const redis = getRedis();
  limiter = redis
    ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m') })
    : null; // fail-open
  return limiter;
}
