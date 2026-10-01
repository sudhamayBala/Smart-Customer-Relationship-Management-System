"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearFailedLogins = exports.recordFailedLogin = exports.isLoginLocked = exports.getRetryAfterSeconds = exports.getRemainingAttempts = void 0;
const radish_1 = __importDefault(require("../config/radish"));
const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 15 * 60; // 15 minutes
const getKey = (email) => `login-attempts:${email.toLowerCase().trim()}`;
const getRemainingAttempts = async (email) => {
    const key = getKey(email);
    const attempts = Number((await radish_1.default.get(key)) ?? "0");
    return Math.max(0, MAX_ATTEMPTS - attempts);
};
exports.getRemainingAttempts = getRemainingAttempts;
const getRetryAfterSeconds = async (email) => {
    const key = getKey(email);
    const ttl = await radish_1.default.ttl(key);
    return ttl > 0 ? ttl : 0;
};
exports.getRetryAfterSeconds = getRetryAfterSeconds;
const isLoginLocked = async (email) => {
    const attempts = await radish_1.default.get(getKey(email));
    if (!attempts) {
        return false;
    }
    return Number(attempts) >= MAX_ATTEMPTS;
};
exports.isLoginLocked = isLoginLocked;
const recordFailedLogin = async (email) => {
    const key = getKey(email);
    const attempts = await radish_1.default.incr(key);
    if (attempts === 1) {
        await radish_1.default.expire(key, LOCKOUT_SECONDS);
    }
    return attempts;
};
exports.recordFailedLogin = recordFailedLogin;
const clearFailedLogins = async (email) => {
    await radish_1.default.del(getKey(email));
};
exports.clearFailedLogins = clearFailedLogins;
