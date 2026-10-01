"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.signupSchema = void 0;
const zod_1 = require("zod");
exports.signupSchema = zod_1.z.object({
    companyName: zod_1.z
        .string()
        .min(2, "Company name must be at least 2 characters")
        .max(150),
    name: zod_1.z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(150),
    email: zod_1.z
        .string()
        .email("Invalid email address"),
    password: zod_1.z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(100),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .email("Invalid email address"),
    password: zod_1.z
        .string()
        .min(1, "Password is required"),
});
