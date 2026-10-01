import redis from "../config/radish";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 15 * 60; // 15 minutes

const getKey = (email: string) =>
  `login-attempts:${email.toLowerCase().trim()}`;

export const getRemainingAttempts = async (email: string): Promise<number> => {
  const key = getKey(email);
  const attempts = Number((await redis.get(key)) ?? "0");

  return Math.max(0, MAX_ATTEMPTS - attempts);
};

export const getRetryAfterSeconds = async (email: string): Promise<number> => {
  const key = getKey(email);
  const ttl = await redis.ttl(key);

  return ttl > 0 ? ttl : 0;
};

export const isLoginLocked = async (
  email: string
): Promise<boolean> => {
  const attempts = await redis.get(getKey(email));

  if (!attempts) {
    return false;
  }

  return Number(attempts) >= MAX_ATTEMPTS;
};

export const recordFailedLogin = async (
  email: string
): Promise<number> => {
  const key = getKey(email);

  const attempts = await redis.incr(key);

  if (attempts === 1) {
    await redis.expire(key, LOCKOUT_SECONDS);
  }

  return attempts;
};

export const clearFailedLogins = async (
  email: string
): Promise<void> => {
  await redis.del(getKey(email));
};
