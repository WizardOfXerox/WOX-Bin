import { describe, expect, it } from "vitest";

import { registerSchema } from "@/lib/validators";

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
