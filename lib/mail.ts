import nodemailer from "nodemailer";

export type SendMailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

function smtpHost() {
  return process.env.SMTP_HOST?.trim() || "";
}

function smtpPort() {
  const p = Number(process.env.SMTP_PORT || "587");
  return Number.isFinite(p) && p > 0 ? p : 587;
}

function smtpSecure() {
  const v = process.env.SMTP_SECURE?.trim().toLowerCase();
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return smtpPort() === 465;
}

/**
 * True when env has enough settings to send mail (transactional / admin test).
 */
export function isSmtpConfigured(): boolean {
  return Boolean(smtpHost() && mailFrom());
}

/** Public “from” address for NextAuth Email provider. */
export function smtpFromAddress(): string {
  return mailFrom();
}

/** Nodemailer transport options for NextAuth `Email` provider. */
export function getSmtpTransportOptions():
  | { host: string; port: number; secure: boolean; auth?: { user: string; pass: string } }
  | null {
  if (!isSmtpConfigured()) {
    return null;
  }
  const user = process.env.SMTP_USER?.trim() || "";
  const pass = process.env.SMTP_PASSWORD ?? "";
  return {
    host: smtpHost(),
    port: smtpPort(),
    secure: smtpSecure(),
    auth: user ? { user, pass } : undefined
  };
}

function mailFrom(): string {
  return (process.env.SMTP_FROM || process.env.MAIL_FROM || "").trim();
}

let transporter: nodemailer.Transporter | null | undefined;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter === undefined) {
    const host = smtpHost();
    if (!host) {
      transporter = null;
      return null;
    }
    const user = process.env.SMTP_USER?.trim() || "";
    const pass = process.env.SMTP_PASSWORD ?? "";
    transporter = nodemailer.createTransport({
      host,
      port: smtpPort(),
      secure: smtpSecure(),
      auth: user ? { user, pass } : undefined
    });
  }
  return transporter;
}

/**
 * Send one email. Returns `{ ok: false }` if SMTP is not configured or send fails.
 */
export async function sendMail(input: SendMailInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const from = mailFrom();
  if (!isSmtpConfigured()) {
    return { ok: false, error: "SMTP is not configured (set SMTP_HOST and SMTP_FROM)." };
  }

  const tx = getTransporter();
  if (!tx) {
    return { ok: false, error: "Could not create mail transport." };
  }

  try {
    await tx.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: input.replyTo
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
