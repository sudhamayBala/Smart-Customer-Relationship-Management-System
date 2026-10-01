import { env } from "./env";

class MemoryRedis {
  isMemoryFallback = true;
  private store = new Map<string, { value: string; expiresAt?: number }>();

  on() {
    return this;
  }

  duplicate() {
    return this;
  }

  async ping() {
    return "PONG";
  }

  async get(key: string) {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: string, ...args: unknown[]) {
    const ttlSeconds = this.extractTtl(args);

    if (ttlSeconds !== null) {
      this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
      return "OK";
    }

    this.store.set(key, { value });
    return "OK";
  }

  async del(...keys: string[]) {
    let removed = 0;

    keys.forEach((key) => {
      if (this.store.delete(key)) {
        removed += 1;
      }
    });

    return removed;
  }

  async scan(cursor = "0", ...args: unknown[]) {
    const pattern = this.findPattern(args);
    const keys = [...this.store.keys()].filter((key) => {
      if (!pattern) {
        return true;
      }

      const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*"));
      return regex.test(key);
    });

    return ["0", keys];
  }

  async incr(key: string) {
    const current = Number((await this.get(key)) ?? 0);
    const next = current + 1;
    await this.set(key, String(next));
    return next;
  }

  async expire(key: string, seconds: number) {
    const current = this.store.get(key);

    if (!current) {
      return 0;
    }

    current.expiresAt = Date.now() + seconds * 1000;
    this.store.set(key, current);
    return 1;
  }

  private extractTtl(args: unknown[]) {
    if (args.length >= 2 && args[0] === "EX") {
      return Number(args[1]);
    }

    return null;
  }

  private findPattern(args: unknown[]) {
    const matchIndex = args.findIndex((value) => value === "MATCH");

    if (matchIndex === -1 || matchIndex + 1 >= args.length) {
      return null;
    }

    return String(args[matchIndex + 1]);
  }
}

const redis = new MemoryRedis();
export const isMemoryRedis = true;

if (env.redisHost && env.redisPort) {
}

export default redis;