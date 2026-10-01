"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTokenFamily = exports.hashRefreshToken = exports.generateRefreshToken = void 0;
const crypto_1 = __importDefault(require("crypto"));
const generateRefreshToken = () => {
    return crypto_1.default.randomBytes(64).toString("hex");
};
exports.generateRefreshToken = generateRefreshToken;
const hashRefreshToken = (token) => {
    return crypto_1.default
        .createHash("sha256")
        .update(token)
        .digest("hex");
};
exports.hashRefreshToken = hashRefreshToken;
const generateTokenFamily = () => {
    return crypto_1.default.randomUUID();
};
exports.generateTokenFamily = generateTokenFamily;
