import { getConfiguredAppOrigin } from "@/lib/request";
import type { SupportTicketStatus } from "@/lib/support";

type EmailAction = {
  label: string;
  url: string;
  hint?: string;
};

type TransactionalEmailInput = {
  preview: string;
  eyebrow: string;
  title: string;
  intro: string;
  details?: string[];
  action?: EmailAction;
  outro?: string[];
  footerNote?: string;
};

type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
};

type AccountModerationEmailInput = {
  status: "active" | "suspended" | "banned";
  suspendedUntil?: Date | null;
  reason?: string | null;
};

type PasteModerationEmailInput = {
  title: string;
  slug: string;
  status: "active" | "hidden" | "deleted";
  reason?: string | null;
};

type SupportTicketEmailInput = {
  ticketId: string;
  subject: string;
  status: SupportTicketStatus;
  previewLine?: string;
  intro: string;
  details?: string[];
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value: string) {
  return escapeHtml(value);
}

function compactLines(lines: Array<string | null | undefined>) {
  return lines.map((line) => line?.trim()).filter((line): line is string => Boolean(line));
}

function renderParagraphs(lines: string[]) {
  return lines
    .map(
      (line) =>
        `<p style="margin:0 0 16px 0;font-family:Segoe UI,Arial,sans-serif;font-size:16px;line-height:1.7;color:#334155;">${escapeHtml(line)}</p>`
    )
    .join("");
}

function appHomeUrl() {
  return getConfiguredAppOrigin();
}

function renderTransactionalEmail(input: TransactionalEmailInput): { text: string; html: string } {
  const details = compactLines(input.details ?? []);
  const outro = compactLines(input.outro ?? []);
  const homeUrl = appHomeUrl();

  const textBlocks = compactLines([
    input.title,
    input.intro,
    details.length ? details.join("\n") : null,
    input.action
      ? compactLines([`${input.action.label}: ${input.action.url}`, input.action.hint]).join("\n")
      : null,
    outro.length ? outro.join("\n") : null,
    homeUrl ? `Open WOX-Bin: ${homeUrl}` : null,
    input.footerNote ?? "WOX-Bin transactional email"
  ]);

  const detailsHtml = details.length
    ? `<div style="margin:24px 0 0 0;border-radius:16px;border:1px solid #dbe4f0;background:#f8fbff;padding:16px 18px;">${renderParagraphs(
        details
      )}</div>`
    : "";

  const actionHtml = input.action
    ? `
      <div style="margin:28px 0 16px 0;">
        <a
          href="${escapeAttr(input.action.url)}"
          style="display:inline-block;border-radius:999px;background:#1d4ed8;padding:14px 22px;font-family:Segoe UI,Arial,sans-serif;font-size:15px;font-weight:700;line-height:1;text-decoration:none;color:#ffffff;"
        >
          ${escapeHtml(input.action.label)}
        </a>
      </div>
      <p style="margin:0 0 16px 0;font-family:Segoe UI,Arial,sans-serif;font-size:13px;line-height:1.6;color:#64748b;">
        ${escapeHtml(input.action.hint ?? "Use the full link below if the button does not open.")}
      </p>
      <div style="margin:0 0 24px 0;border-radius:14px;border:1px solid #dbe4f0;background:#f8fafc;padding:14px 16px;">
        <p style="margin:0 0 8px 0;font-family:Segoe UI,Arial,sans-serif;font-size:12px;line-height:1.5;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">
          Direct link
        </p>
        <p style="margin:0;font-family:Consolas,'SFMono-Regular',Menlo,monospace;font-size:12px;line-height:1.7;word-break:break-all;color:#0f172a;">
          <a href="${escapeAttr(input.action.url)}" style="color:#1d4ed8;text-decoration:underline;">${escapeHtml(input.action.url)}</a>
        </p>
      </div>
    `
    : "";

  const footerLinks = homeUrl
    ? `<p style="margin:0;font-family:Segoe UI,Arial,sans-serif;font-size:13px;line-height:1.6;color:#64748b;">Open WOX-Bin: <a href="${escapeAttr(
        homeUrl
      )}" style="color:#1d4ed8;text-decoration:underline;">${escapeHtml(homeUrl)}</a></p>`
    : "";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light only" />
    <title>${escapeHtml(input.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#eef2f7;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
      ${escapeHtml(input.preview)}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#eef2f7;">
      <tr>
        <td align="center" style="padding:28px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;border-collapse:separate;background:#ffffff;border:1px solid #dbe4f0;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:22px 28px;background:#0f172a;">
                <p style="margin:0 0 10px 0;font-family:Segoe UI,Arial,sans-serif;font-size:12px;line-height:1.4;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#93c5fd;">
                  WOX-Bin
                </p>
                <p style="margin:0;font-family:Segoe UI,Arial,sans-serif;font-size:28px;line-height:1.2;font-weight:700;color:#ffffff;">
                  ${escapeHtml(input.title)}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px 24px 28px;">
                <p style="margin:0 0 12px 0;font-family:Segoe UI,Arial,sans-serif;font-size:12px;line-height:1.4;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#64748b;">
                  ${escapeHtml(input.eyebrow)}
                </p>
                ${renderParagraphs([input.intro])}
                ${detailsHtml}
                ${actionHtml}
                ${renderParagraphs(outro)}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 24px 28px;border-top:1px solid #e2e8f0;background:#f8fafc;">
                <p style="margin:0 0 8px 0;font-family:Segoe UI,Arial,sans-serif;font-size:13px;line-height:1.6;color:#64748b;">
                  ${escapeHtml(input.footerNote ?? "This email was sent by WOX-Bin.")}
                </p>
                ${footerLinks}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    text: textBlocks.join("\n\n"),
    html
  };
}

export function buildSignupVerificationEmail(verifyUrl: string): RenderedEmail {
  const rendered = renderTransactionalEmail({
    preview: "Verify your WOX-Bin email address",
    eyebrow: "Email verification",
    title: "Confirm your email address",
    intro: "Finish setting up your WOX-Bin account by verifying the email address attached to it.",
    details: [
      "This verification link expires in 48 hours.",
      "If you did not create this account, you can ignore this email."
    ],
    action: {
      label: "Verify email",
      url: verifyUrl,
      hint: "This link expires in 48 hours."
    },
    footerNote: "Protect your account by only opening verification links you requested."
  });

  return {
    subject: "Verify your WOX-Bin email",
    ...rendered
  };
}

export function buildPasswordResetEmail(resetUrl: string): RenderedEmail {
  const rendered = renderTransactionalEmail({
    preview: "Reset your WOX-Bin password",
    eyebrow: "Password reset",
    title: "Reset your password",
    intro: "We received a request to reset the password for your WOX-Bin account.",
    details: [
      "This reset link expires in 1 hour.",
      "If you did not request a password reset, you can ignore this email."
    ],
    action: {
      label: "Reset password",
      url: resetUrl,
      hint: "This link expires in 1 hour."
    },
    footerNote: "For security, password reset links should only be used once and only by the account owner."
  });

  return {
    subject: "Reset your WOX-Bin password",
    ...rendered
  };
}

export function buildMagicLinkEmail(signInUrl: string, expires: Date): RenderedEmail {
  const expiresLabel = expires.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  });
  const host = (() => {
    try {
      return new URL(signInUrl).host;
    } catch {
      return null;
    }
  })();

  const rendered = renderTransactionalEmail({
    preview: "Use this secure sign-in link for WOX-Bin",
    eyebrow: "Magic link sign-in",
    title: "Use this sign-in link",
    intro: "Use the button below to finish signing in to WOX-Bin without entering your password.",
    details: compactLines([
      host ? `Requested from: ${host}` : null,
      `This sign-in link expires on ${expiresLabel}.`,
      "If you did not request this sign-in email, you can ignore it."
    ]),
    action: {
      label: "Sign in to WOX-Bin",
      url: signInUrl,
      hint: `This sign-in link expires on ${expiresLabel}.`
    },
    footerNote: "Magic links should be treated like passwords. Do not forward this email."
  });

  return {
    subject: "Your WOX-Bin sign-in link",
    ...rendered
  };
}

export function buildSmtpTestEmail(): RenderedEmail {
  const homeUrl = appHomeUrl();
  const rendered = renderTransactionalEmail({
    preview: "SMTP is working for WOX-Bin",
    eyebrow: "SMTP test",
    title: "Outbound email is working",
    intro: "This message confirms that WOX-Bin can connect to your SMTP provider and deliver mail successfully.",
    details: compactLines([
      homeUrl ? `Configured app origin: ${homeUrl}` : null,
      "You can now use verification emails, password resets, and magic-link sign-in."
    ]),
    action: homeUrl
      ? {
          label: "Open WOX-Bin",
          url: homeUrl
        }
      : undefined,
    footerNote: "This is an operator test message from WOX-Bin."
  });

  return {
    subject: "WOX-Bin SMTP test",
    ...rendered
  };
}

export function buildAccountModerationEmail(input: AccountModerationEmailInput): RenderedEmail {
  const homeUrl = appHomeUrl();
  const details =
    input.status === "active"
      ? compactLines([
          "Your account has been restored to active access.",
          input.reason ? `Note from the administrator: ${input.reason}` : null
        ])
      : input.status === "suspended"
        ? compactLines([
            input.suspendedUntil
              ? `Your account is suspended until ${input.suspendedUntil.toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short"
                })}.`
              : "Your account has been suspended.",
            input.reason ? `Reason: ${input.reason}` : null
          ])
        : compactLines([
            "Your account has been permanently banned from signing in to WOX-Bin.",
            input.reason ? `Reason: ${input.reason}` : null
          ]);

  const rendered = renderTransactionalEmail({
    preview:
      input.status === "active"
        ? "Your WOX-Bin account has been restored"
        : input.status === "suspended"
          ? "Your WOX-Bin account has been suspended"
          : "Your WOX-Bin account has been banned",
    eyebrow: "Account moderation",
    title:
      input.status === "active"
        ? "Your account is active again"
        : input.status === "suspended"
          ? "Your account has been suspended"
          : "Your account has been banned",
    intro:
      input.status === "active"
        ? "An administrator reviewed your account and restored access."
        : input.status === "suspended"
          ? "An administrator reviewed your account and temporarily suspended access."
          : "An administrator reviewed your account and permanently revoked access.",
    details,
    action:
      input.status === "active" && homeUrl
        ? {
            label: "Open WOX-Bin",
            url: homeUrl
          }
        : undefined,
    footerNote:
      input.status === "active"
        ? "If you still cannot sign in, contact the site operator."
        : "If you believe this moderation action is incorrect, contact the site operator."
  });

  return {
    subject:
      input.status === "active"
        ? "Your WOX-Bin account was restored"
        : input.status === "suspended"
          ? "Your WOX-Bin account was suspended"
          : "Your WOX-Bin account was banned",
    ...rendered
  };
}

export function buildPasteModerationEmail(input: PasteModerationEmailInput): RenderedEmail {
  const pasteUrl = appHomeUrl() ? `${appHomeUrl()}/p/${input.slug}` : null;
  const details = compactLines([
    `Paste title: ${input.title}`,
    `Paste slug: ${input.slug}`,
    input.reason ? `Reason: ${input.reason}` : null
  ]);

  const rendered = renderTransactionalEmail({
    preview:
      input.status === "active"
        ? "Your paste is visible again"
        : input.status === "hidden"
          ? "Your paste was hidden"
          : "Your paste was removed",
    eyebrow: "Paste moderation",
    title:
      input.status === "active"
        ? "Your paste was restored"
        : input.status === "hidden"
          ? "Your paste was hidden"
          : "Your paste was removed",
    intro:
      input.status === "active"
        ? "A moderator restored visibility for one of your pastes."
        : input.status === "hidden"
          ? "A moderator hid one of your pastes from public access."
          : "A moderator deleted one of your pastes.",
    details,
    action:
      input.status === "active" && pasteUrl
        ? {
            label: "Open paste",
            url: pasteUrl
          }
        : undefined,
    footerNote: "If you need clarification on this moderation action, contact the site operator."
  });

  return {
    subject:
      input.status === "active"
        ? "Your WOX-Bin paste was restored"
        : input.status === "hidden"
          ? "Your WOX-Bin paste was hidden"
          : "Your WOX-Bin paste was deleted",
    ...rendered
  };
}

function buildSupportTicketEmail(input: SupportTicketEmailInput): RenderedEmail {
  const supportUrl = appHomeUrl() ? `${appHomeUrl()}/support?ticket=${encodeURIComponent(input.ticketId)}` : null;
  const rendered = renderTransactionalEmail({
    preview: input.previewLine ?? `Support update for ticket ${input.ticketId}`,
    eyebrow: "Support",
    title: `Support ticket ${input.ticketId.slice(0, 8).toUpperCase()}`,
    intro: input.intro,
    details: compactLines([
      `Subject: ${input.subject}`,
      `Current status: ${input.status.replace(/_/g, " ")}`,
      ...(input.details ?? [])
    ]),
    action: supportUrl
      ? {
          label: "Open support ticket",
          url: supportUrl
        }
      : undefined,
    footerNote: "Replies and ticket history are tracked inside WOX-Bin support."
  });

  return {
    subject: `WOX-Bin support: ${input.subject}`,
    ...rendered
  };
}

export function buildSupportTicketCreatedEmail(input: Omit<SupportTicketEmailInput, "intro">): RenderedEmail {
  return buildSupportTicketEmail({
    ...input,
    intro: "Your support request was received. Staff will respond inside WOX-Bin support as soon as it is reviewed."
  });
}

export function buildSupportTicketReplyEmail(input: Omit<SupportTicketEmailInput, "intro">): RenderedEmail {
  return buildSupportTicketEmail({
    ...input,
    intro: "There is a new staff reply on your support ticket."
  });
}

export function buildSupportTicketStatusEmail(input: Omit<SupportTicketEmailInput, "intro">): RenderedEmail {
  return buildSupportTicketEmail({
    ...input,
    intro: "The status of your support ticket changed."
  });
}
