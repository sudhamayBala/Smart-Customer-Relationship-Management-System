import crypto from "crypto";
import { Transaction } from "sequelize";
import { User } from "../models/Index";
import { hashPassword } from "../utils/password";
import Invite from "./Invite";

export type InviteRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "AGENT";

export const createInvite = async ({
  email,
  role,
  tenantId,
  inviterId,
  transaction,
  allowExistingUser = false,
}: {
  email: string;
  role: InviteRole;
  tenantId: number;
  inviterId: number;
  transaction?: Transaction;
  allowExistingUser?: boolean;
}) => {
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({
    where: { email: normalizedEmail },
    transaction,
  });

  if (existingUser && !allowExistingUser) {
    throw new Error("User with this email already exists");
  }

  const invite = await Invite.create({
    tenantId,
    email: normalizedEmail,
    inviterId,
    role,
    token: crypto.randomBytes(32).toString("hex"),
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

export const validateInviteToken = async (token: string) => {
  if (!token || typeof token !== "string") return null;

  const invite = await Invite.findOne({
    where: { token, status: "PENDING" },
  });

  if (!invite) return null;
  if (invite.expiresAt.getTime() < Date.now()) {
    await invite.update({ status: "EXPIRED" });
    return null;
  }

  return invite;
};

export const acceptInvite = async (
  token: string,
  credentials: { name?: string; password?: string } = {}
) => {
  const invite = await validateInviteToken(token);
  if (!invite) return null;

  const existingUser = await User.findOne({
    where: { email: invite.email },
  });

  if (existingUser) {
    if (credentials.name && credentials.password) {
      await existingUser.update({
        name: credentials.name.trim(),
        passwordHash: await hashPassword(credentials.password),
      });
    }
    await invite.update({ status: "ACCEPTED" });
    return existingUser;
  }

  const generatedPassword = credentials.password
    ? undefined
    : `TempPass!${Date.now()}`;
  const user = await User.create({
    tenantId: invite.tenantId,
    name: credentials.name?.trim() || invite.email.split("@")[0],
    email: invite.email,
    passwordHash: await hashPassword(credentials.password || generatedPassword!),
    role: invite.role,
  });

  await invite.update({ status: "ACCEPTED" });
  return generatedPassword ? { user, temporaryPassword: generatedPassword } : user;
};