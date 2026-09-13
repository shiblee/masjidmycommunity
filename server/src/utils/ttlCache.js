// A minimal in-process, single-value TTL cache for a "slow-moving
// aggregate" read (see the Community Wall Performance & Scalability audit)
// -- not Redis, deliberately. The app runs as one pm2 fork-mode process, so
// there's no cross-instance cache to keep in sync; this only has to stop
// one process from re-running the same expensive query on every request.
//
// Concurrent requests arriving during a cache miss will each trigger their
// own fn() call rather than sharing one in-flight promise -- acceptable for
// a value cheap enough to recompute and requested rarely enough that this
// "thundering herd" case doesn't actually happen in practice; revisit if
// that stops being true.
export function withTtlCache(fn, ttlMs) {
  let cached = null;
  let expiresAt = 0;
  return async (...args) => {
    if (cached !== null && Date.now() < expiresAt) return cached;
    const result = await fn(...args);
    cached = result;
    expiresAt = Date.now() + ttlMs;
    return result;
  };
}
