import crypto from "node:crypto";
import type { StringValue } from "ms";
import ms from "ms";
import { env } from "../config/env";
import { UnauthorizedError } from "../lib/errors";

export function validateRootPassword(password: string | undefined): void {
  if (!password) throw new UnauthorizedError("Missing password");
  const provided = Buffer.from(password);
  const expected = Buffer.from(env.MANUAL_EMAIL_PASSWORD);
  if (
    provided.length !== expected.length ||
    !crypto.timingSafeEqual(provided, expected)
  ) {
    throw new UnauthorizedError("Invalid password");
  }
}

export function validateBootstrapSecret(secret: string | undefined): void {
  if (!secret) throw new UnauthorizedError("Missing bootstrap secret");
  const provided = Buffer.from(secret);
  const expected = Buffer.from(env.BOOTSTRAP_SECRET);
  if (
    provided.length !== expected.length ||
    !crypto.timingSafeEqual(provided, expected)
  ) {
    throw new UnauthorizedError("Invalid bootstrap secret");
  }
}

export function generateOtp(digits: number = 6): string {
  const min = 10 ** (digits - 1);
  const max = 10 ** digits;
  return crypto.randomInt(min, max).toString();
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function parseRefreshExpiryMs(rememberMe: boolean = false): number {
  const raw = rememberMe
    ? env.JWT_REMEMBER_ME_EXPIRES_IN
    : env.JWT_REFRESH_EXPIRES_IN;
  return ms(raw as StringValue);
}

const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const NUMBERS = "0123456789";
const SPECIAL = "!@#$%&";
const ALL_CHARS = UPPERCASE + LOWERCASE + NUMBERS + SPECIAL;

export function generatePassword(length: number = 10): string {
  if (length < 6 || length > 20) {
    throw new Error("Password length must be between 6 and 20 characters");
  }

  const password = [
    randomChar(UPPERCASE),
    randomChar(LOWERCASE),
    randomChar(NUMBERS),
    randomChar(SPECIAL),
  ];

  while (password.length < length) {
    password.push(randomChar(ALL_CHARS));
  }

  return shuffle(password).join("");
}

function randomChar(chars: string): string {
  return chars[crypto.randomInt(chars.length)];
}

function shuffle(chars: string[]): string[] {
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars;
}
