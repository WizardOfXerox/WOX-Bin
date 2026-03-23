import { describe, expect, it } from "vitest";

import { accountPasswordSchema, registerSchema, supportTicketCreateSchema, supportTicketReplySchema } from "@/lib/validators";

describe("registerSchema", () => {
  it("requires email for credentials sign-up", () => {
    const result = registerSchema.safeParse({
      username: "wizard",
      email: "",
      password: "supersecret123",
      turnstileToken: "",
      acceptTerms: true
    });

    expect(result.success).toBe(false);
  });

  it("accepts a valid email address", () => {
    const result = registerSchema.safeParse({
      username: "wizard",
      email: "USER@example.com",
      password: "supersecret123",
      turnstileToken: "",
      acceptTerms: true
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@example.com");
    }
  });
});

describe("accountPasswordSchema", () => {
  it("requires passwords to be at least 8 characters", () => {
    const result = accountPasswordSchema.safeParse({
      newPassword: "short"
    });

    expect(result.success).toBe(false);
  });

  it("accepts password creation and password change payloads", () => {
    const createResult = accountPasswordSchema.safeParse({
      newPassword: "new-password-123"
    });
    const changeResult = accountPasswordSchema.safeParse({
      currentPassword: "old-password-123",
      newPassword: "new-password-123"
    });

    expect(createResult.success).toBe(true);
    expect(changeResult.success).toBe(true);
  });
});

describe("support ticket schemas", () => {
  it("accepts support tickets with image attachments", () => {
    const result = supportTicketCreateSchema.safeParse({
      subject: "Cannot access a paste",
      category: "paste",
      relatedPasteSlug: "demo-paste",
      content: "Opening the paste returns a permission error even though I own it.",
      attachments: [
        {
          filename: "screenshot.png",
          mimeType: "image/png",
          content: "aGVsbG8xMjM0",
          sizeBytes: 1024
        }
      ]
    });

    expect(result.success).toBe(true);
  });

  it("rejects non-image support attachments", () => {
    const result = supportTicketReplySchema.safeParse({
      content: "See attachment",
      attachments: [
        {
          filename: "payload.svg",
          mimeType: "image/svg+xml",
          content: "aGVsbG8xMjM0",
          sizeBytes: 1024
        }
      ]
    });

    expect(result.success).toBe(false);
  });
});
