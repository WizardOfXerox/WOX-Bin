import QRCode from "qrcode";
import { and, eq, gt, isNull } from "drizzle-orm";

import { db, sql as dbSql } from "@/lib/db";
import {
  mfaLoginTickets,
  userTotpFactors,
  userTotpRecoveryCodes,
  userTotpSetupSessions,
  users
} from "@/lib/db/schema";
import {
  decryptSensitiveValue,
  encryptSensitiveValue,
  hashToken,
  verifyPassword
} from "@/lib/crypto";
import {
  createOtpAuthUri,
  createRecoveryCodes,
  createTotpSecret,
  sanitizeTotpCode,
  verifyTotpCode
} from "@/lib/totp";

const TOTP_SETUP_TTL_MS = 1000 * 60 * 15;
const MFA_TICKET_TTL_MS = 1000 * 60 * 10;
const TOTP_ISSUER = "WOX-Bin";
const TOTP_SCHEMA_CACHE_TTL_MS = 30 * 1000;

let totpSchemaAvailabilityCache: { value: boolean; checkedAt: number } | null = null;
let totpSchemaAvailabilityProbe: Promise<boolean> | null = null;

export type TotpSetupPayload = {
  setupId: string;
  secret: string;
  otpauthUri: string;
  qrSvg: string;
};

export type TotpStatus = {
  available: boolean;
  enabled: boolean;
  setupPending: boolean;
  enabledAt: Date | null;
  lastUsedAt: Date | null;
  remainingRecoveryCodes: number;
};

const TOTP_UNAVAILABLE_MESSAGE =
  "Authenticator sign-in is not ready on this deployment yet. Ask the site operator to apply the latest database schema.";

function accountLabelForUser(user: { username?: string | null; email?: string | null }) {
  return user.username?.trim() || user.email?.trim() || "account";
}

function isMissingTotpSchemaError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  const message = error instanceof Error ? error.message : String(error ?? "");
  return code === "42P01" || /relation .*user_totp_|relation .*mfa_login_tickets/i.test(message);
}

export function isTotpUnavailableError(error: unknown) {
  return error instanceof Error && error.message === TOTP_UNAVAILABLE_MESSAGE;
}

function cacheTotpSchemaAvailability(value: boolean) {
  totpSchemaAvailabilityCache = {
    value,
    checkedAt: Date.now()
  };
  return value;
}

export async function isTotpSchemaAvailable() {
  const now = Date.now();
  if (
    totpSchemaAvailabilityCache &&
    (totpSchemaAvailabilityCache.value || now - totpSchemaAvailabilityCache.checkedAt < TOTP_SCHEMA_CACHE_TTL_MS)
  ) {
    return totpSchemaAvailabilityCache.value;
  }

  if (totpSchemaAvailabilityProbe) {
    return totpSchemaAvailabilityProbe;
  }

  totpSchemaAvailabilityProbe = (async () => {
    try {
      const rows = await dbSql<{ count: number }[]>`
        select count(*)::int as count
        from information_schema.tables
        where table_schema = 'public'
          and table_name in (
            'user_totp_factors',
            'user_totp_recovery_codes',
            'user_totp_setup_sessions',
            'mfa_login_tickets'
          )
      `;
      return cacheTotpSchemaAvailability(Number(rows[0]?.count ?? 0) === 4);
    } catch {
      return cacheTotpSchemaAvailability(false);
    } finally {
      totpSchemaAvailabilityProbe = null;
    }
  })();

  return totpSchemaAvailabilityProbe;
}

async function assertTotpSchemaAvailable() {
  if (!(await isTotpSchemaAvailable())) {
    throw new Error(TOTP_UNAVAILABLE_MESSAGE);
  }
}

function unavailableTotpStatus(): TotpStatus {
  return {
    available: false,
    enabled: false,
    setupPending: false,
    enabledAt: null,
    lastUsedAt: null,
    remainingRecoveryCodes: 0
  };
}

export async function getTotpStatus(userId: string): Promise<TotpStatus> {
  if (!(await isTotpSchemaAvailable())) {
    return unavailableTotpStatus();
  }

  let factor: typeof userTotpFactors.$inferSelect | undefined;
  let setup: typeof userTotpSetupSessions.$inferSelect | undefined;
  try {
    const [factorRows, setupRows] = await Promise.all([
      db.select().from(userTotpFactors).where(eq(userTotpFactors.userId, userId)).limit(1),
      db
        .select()
        .from(userTotpSetupSessions)
        .where(and(eq(userTotpSetupSessions.userId, userId), gt(userTotpSetupSessions.expiresAt, new Date())))
        .limit(1)
    ]);
    factor = factorRows[0];
    setup = setupRows[0];
  } catch (error) {
    if (isMissingTotpSchemaError(error)) {
      cacheTotpSchemaAvailability(false);
      return unavailableTotpStatus();
    }
    throw error;
  }

  const remainingRecoveryCodes = factor
    ? await db.$count(
        userTotpRecoveryCodes,
        and(eq(userTotpRecoveryCodes.userId, userId), isNull(userTotpRecoveryCodes.usedAt))
      )
    : 0;

  return {
    available: true,
    enabled: Boolean(factor),
    setupPending: Boolean(setup),
    enabledAt: factor?.enabledAt ?? null,
    lastUsedAt: factor?.lastUsedAt ?? null,
    remainingRecoveryCodes
  };
}

export async function startTotpSetup(userId: string) {
  await assertTotpSchemaAvailable();

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      username: true,
      email: true
    }
  });

  if (!user) {
    throw new Error("Account not found.");
  }

  const [existingFactor] = await db
    .select({ userId: userTotpFactors.userId })
    .from(userTotpFactors)
    .where(eq(userTotpFactors.userId, userId))
    .limit(1);
  if (existingFactor) {
    throw new Error("Authenticator app is already enabled.");
  }

  const secret = createTotpSecret();
  const otpauthUri = createOtpAuthUri({
    accountLabel: accountLabelForUser(user),
    issuer: TOTP_ISSUER,
    secret
  });
  const qrSvg = await QRCode.toString(otpauthUri, {
    type: "svg",
    margin: 1,
    width: 220
  });

  await db.delete(userTotpSetupSessions).where(eq(userTotpSetupSessions.userId, userId));
  const [setup] = await db
    .insert(userTotpSetupSessions)
    .values({
      userId,
      secretEncrypted: encryptSensitiveValue(secret),
      expiresAt: new Date(Date.now() + TOTP_SETUP_TTL_MS)
    })
    .returning({ id: userTotpSetupSessions.id });

  if (!setup) {
    throw new Error("Could not start authenticator setup.");
  }

  return {
    setupId: setup.id,
    secret,
    otpauthUri,
    qrSvg
  } satisfies TotpSetupPayload;
}

export async function enableTotpFromSetup(userId: string, setupId: string, code: string) {
  await assertTotpSchemaAvailable();

  const [setup] = await db
    .select()
    .from(userTotpSetupSessions)
    .where(
      and(
        eq(userTotpSetupSessions.id, setupId),
        eq(userTotpSetupSessions.userId, userId),
        gt(userTotpSetupSessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!setup) {
    throw new Error("Authenticator setup expired. Start setup again.");
  }

  const secret = decryptSensitiveValue(setup.secretEncrypted);
  if (!verifyTotpCode(secret, code)) {
    throw new Error("That code is invalid. Check the authenticator app and try again.");
  }

  const recoveryCodes = createRecoveryCodes();

  await db.delete(userTotpRecoveryCodes).where(eq(userTotpRecoveryCodes.userId, userId));
  await db.delete(userTotpFactors).where(eq(userTotpFactors.userId, userId));

  await db.insert(userTotpFactors).values({
    userId,
    secretEncrypted: encryptSensitiveValue(secret),
    enabledAt: new Date(),
    lastUsedAt: new Date(),
    updatedAt: new Date()
  });

  if (recoveryCodes.length) {
    await db.insert(userTotpRecoveryCodes).values(
      recoveryCodes.map((recoveryCode) => ({
        userId,
        codeHash: hashToken(recoveryCode)
      }))
    );
  }

  await db.delete(userTotpSetupSessions).where(eq(userTotpSetupSessions.userId, userId));

  return recoveryCodes;
}

export async function verifyTotpOrRecoveryChallenge({
  userId,
  code,
  recoveryCode,
  markUsed = true
}: {
  userId: string;
  code?: string | null;
  recoveryCode?: string | null;
  markUsed?: boolean;
}) {
  await assertTotpSchemaAvailable();

  const [factor] = await db.select().from(userTotpFactors).where(eq(userTotpFactors.userId, userId)).limit(1);

  if (!factor) {
    throw new Error("Authenticator app is not enabled on this account.");
  }

  const normalizedCode = sanitizeTotpCode(code);
  if (normalizedCode && verifyTotpCode(decryptSensitiveValue(factor.secretEncrypted), normalizedCode)) {
    if (markUsed) {
      await db
        .update(userTotpFactors)
        .set({ lastUsedAt: new Date(), updatedAt: new Date() })
        .where(eq(userTotpFactors.userId, userId));
    }
    return { method: "totp" as const };
  }

  const normalizedRecoveryCode = String(recoveryCode ?? "").trim().toUpperCase();
  if (!normalizedRecoveryCode) {
    throw new Error("Enter a code from your authenticator app or one of your recovery codes.");
  }

  const [recovery] = await db
    .select()
    .from(userTotpRecoveryCodes)
    .where(
      and(
        eq(userTotpRecoveryCodes.userId, userId),
        eq(userTotpRecoveryCodes.codeHash, hashToken(normalizedRecoveryCode)),
        isNull(userTotpRecoveryCodes.usedAt)
      )
    )
    .limit(1);

  if (!recovery) {
    throw new Error("That authenticator or recovery code is invalid.");
  }

  if (markUsed) {
    await db
      .update(userTotpRecoveryCodes)
      .set({ usedAt: new Date() })
      .where(eq(userTotpRecoveryCodes.id, recovery.id));
    await db
      .update(userTotpFactors)
      .set({ lastUsedAt: new Date(), updatedAt: new Date() })
      .where(eq(userTotpFactors.userId, userId));
  }

  return { method: "recovery" as const };
}

export async function disableTotpForUser({
  userId,
  password,
  code,
  recoveryCode
}: {
  userId: string;
  password?: string | null;
  code?: string | null;
  recoveryCode?: string | null;
}) {
  await assertTotpSchemaAvailable();

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      passwordHash: true
    }
  });

  if (!user) {
    throw new Error("Account not found.");
  }

  if (user.passwordHash) {
    if (!password) {
      throw new Error("Current password is required to disable authenticator sign-in.");
    }
    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      throw new Error("Current password is incorrect.");
    }
  } else {
    await verifyTotpOrRecoveryChallenge({
      userId,
      code,
      recoveryCode,
      markUsed: Boolean(recoveryCode?.trim())
    });
  }

  await db.delete(userTotpRecoveryCodes).where(eq(userTotpRecoveryCodes.userId, userId));
  await db.delete(userTotpFactors).where(eq(userTotpFactors.userId, userId));
  await db.delete(userTotpSetupSessions).where(eq(userTotpSetupSessions.userId, userId));
}

export async function regenerateRecoveryCodes(userId: string, code: string, recoveryCode?: string | null) {
  await assertTotpSchemaAvailable();

  await verifyTotpOrRecoveryChallenge({
    userId,
    code,
    recoveryCode,
    markUsed: Boolean(recoveryCode?.trim())
  });
  const recoveryCodes = createRecoveryCodes();
  await db.delete(userTotpRecoveryCodes).where(eq(userTotpRecoveryCodes.userId, userId));
  await db.insert(userTotpRecoveryCodes).values(
    recoveryCodes.map((value) => ({
      userId,
      codeHash: hashToken(value)
    }))
  );
  return recoveryCodes;
}

export async function createMfaLoginTicket({
  userId,
  provider,
  callbackUrl
}: {
  userId: string;
  provider: string;
  callbackUrl?: string | null;
}) {
  await assertTotpSchemaAvailable();

  await db
    .delete(mfaLoginTickets)
    .where(and(eq(mfaLoginTickets.userId, userId), isNull(mfaLoginTickets.consumedAt)));

  const [ticket] = await db
    .insert(mfaLoginTickets)
    .values({
      userId,
      provider,
      callbackUrl: callbackUrl ?? "/app",
      expiresAt: new Date(Date.now() + MFA_TICKET_TTL_MS)
    })
    .returning({
      id: mfaLoginTickets.id,
      callbackUrl: mfaLoginTickets.callbackUrl
    });

  if (!ticket) {
    throw new Error("Could not create the MFA challenge.");
  }

  return ticket;
}

export async function consumeMfaTicket({
  ticketId,
  code,
  recoveryCode
}: {
  ticketId: string;
  code?: string | null;
  recoveryCode?: string | null;
}) {
  await assertTotpSchemaAvailable();

  const [ticket] = await db
    .select()
    .from(mfaLoginTickets)
    .where(
      and(
        eq(mfaLoginTickets.id, ticketId),
        isNull(mfaLoginTickets.consumedAt),
        gt(mfaLoginTickets.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!ticket) {
    throw new Error("This sign-in challenge has expired. Start sign-in again.");
  }

  await verifyTotpOrRecoveryChallenge({
    userId: ticket.userId,
    code,
    recoveryCode
  });

  await db
    .update(mfaLoginTickets)
    .set({ consumedAt: new Date() })
    .where(eq(mfaLoginTickets.id, ticket.id));

  return {
    userId: ticket.userId,
    callbackUrl: ticket.callbackUrl ?? "/app"
  };
}

export async function isTotpEnabled(userId: string) {
  if (!(await isTotpSchemaAvailable())) {
    return false;
  }

  try {
    const [factor] = await db
      .select({ userId: userTotpFactors.userId })
      .from(userTotpFactors)
      .where(eq(userTotpFactors.userId, userId))
      .limit(1);
    return Boolean(factor);
  } catch (error) {
    if (isMissingTotpSchemaError(error)) {
      cacheTotpSchemaAvailability(false);
      return false;
    }
    throw error;
  }
}
