"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptInvite = exports.validateInviteToken = exports.createInvite = void 0;
const crypto_1 = __importDefault(require("crypto"));
const Index_1 = require("../models/Index");
const password_1 = require("../utils/password");
const Invite_1 = __importDefault(require("./Invite"));
const createInvite = async ({ email, role, tenantId, inviterId, transaction, allowExistingUser = false, }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await Index_1.User.findOne({
        where: { email: normalizedEmail },
        transaction,
    });
    if (existingUser && !allowExistingUser) {
        throw new Error("User with this email already exists");
    }
    const invite = await Invite_1.default.create({
        tenantId,
        email: normalizedEmail,
        inviterId,
        role,
        token: crypto_1.default.randomBytes(32).toString("hex"),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: "PENDING",
    }, { transaction });
    return {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        token: invite.token,
        expiresAt: invite.expiresAt,
        status: invite.status,
    };
};
exports.createInvite = createInvite;
const validateInviteToken = async (token) => {
    if (!token || typeof token !== "string")
        return null;
    const invite = await Invite_1.default.findOne({
        where: { token, status: "PENDING" },
    });
    if (!invite)
        return null;
    if (invite.expiresAt.getTime() < Date.now()) {
        await invite.update({ status: "EXPIRED" });
        return null;
    }
    return invite;
};
exports.validateInviteToken = validateInviteToken;
const acceptInvite = async (token, credentials = {}) => {
    const invite = await (0, exports.validateInviteToken)(token);
    if (!invite)
        return null;
    const existingUser = await Index_1.User.findOne({
        where: { email: invite.email },
    });
    if (existingUser) {
        if (credentials.name && credentials.password) {
            await existingUser.update({
                name: credentials.name.trim(),
                passwordHash: await (0, password_1.hashPassword)(credentials.password),
            });
        }
        await invite.update({ status: "ACCEPTED" });
        return existingUser;
    }
    const generatedPassword = credentials.password
        ? undefined
        : `TempPass!${Date.now()}`;
    const user = await Index_1.User.create({
        tenantId: invite.tenantId,
        name: credentials.name?.trim() || invite.email.split("@")[0],
        email: invite.email,
        passwordHash: await (0, password_1.hashPassword)(credentials.password || generatedPassword),
        role: invite.role,
    });
    await invite.update({ status: "ACCEPTED" });
    return generatedPassword ? { user, temporaryPassword: generatedPassword } : user;
};
exports.acceptInvite = acceptInvite;
