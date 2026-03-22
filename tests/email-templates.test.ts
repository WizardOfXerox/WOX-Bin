import { describe, expect, it } from "vitest";

import {
  buildAccountModerationEmail,
  buildMagicLinkEmail,
  buildPasswordResetEmail,
  buildPasteModerationEmail,
  buildSignupVerificationEmail,
  buildSmtpTestEmail
} from "@/lib/email-templates";

describe("email templates", () => {
  it("renders verification email with subject and link", () => {
    const email = buildSignupVerificationEmail("https://example.com/api/auth/verify-email?token=abc123");

    expect(email.subject).toBe("Verify your WOX-Bin email");
    expect(email.text).toContain("https://example.com/api/auth/verify-email?token=abc123");
    expect(email.html).toContain("Confirm your email address");
    expect(email.html).toContain("Verify email");
  });

  it("renders password reset email with reset details", () => {
    const email = buildPasswordResetEmail("https://example.com/reset-password?token=abc123");

    expect(email.subject).toBe("Reset your WOX-Bin password");
    expect(email.text).toContain("This reset link expires in 1 hour.");
    expect(email.html).toContain("Reset your password");
  });

  it("renders magic-link email with expiry", () => {
    const expires = new Date("2026-03-23T18:30:00.000Z");
    const email = buildMagicLinkEmail("https://example.com/api/auth/callback/email?token=abc123", expires);

    expect(email.subject).toBe("Your WOX-Bin sign-in link");
    expect(email.text).toContain("example.com");
    expect(email.html).toContain("Magic link sign-in");
  });

  it("renders smtp test email", () => {
    const email = buildSmtpTestEmail();

    expect(email.subject).toBe("WOX-Bin SMTP test");
    expect(email.html).toContain("Outbound email is working");
  });

  it("renders account moderation email", () => {
    const email = buildAccountModerationEmail({
      status: "suspended",
      suspendedUntil: new Date("2026-03-24T10:00:00.000Z"),
      reason: "Repeated abuse reports"
    });

    expect(email.subject).toBe("Your WOX-Bin account was suspended");
    expect(email.text).toContain("Repeated abuse reports");
    expect(email.html).toContain("Your account has been suspended");
  });

  it("renders paste moderation email", () => {
    const email = buildPasteModerationEmail({
      title: "Example Paste",
      slug: "example-paste",
      status: "hidden",
      reason: "Policy violation"
    });

    expect(email.subject).toBe("Your WOX-Bin paste was hidden");
    expect(email.text).toContain("example-paste");
    expect(email.html).toContain("Your paste was hidden");
  });
});
