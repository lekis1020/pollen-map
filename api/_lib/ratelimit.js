import { Ratelimit } from '@upstash/ratelimit';
import { getRedis } from './redis.js';

let limiter;
export function getLimiter() {
  if (limiter !== undefined) return limiter;
  const redis = getRedis();
  limiter = redis
    // 기존(공유) Upstash DB를 써도 다른 프로젝트와 키가 겹치지 않도록 prefix 고정.
    ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m'), prefix: 'pollen:rl' })
    : null; // fail-open
  return limiter;
}
