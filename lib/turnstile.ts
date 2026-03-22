import { env } from "@/lib/env";

type TurnstileResult = {
  ok: boolean;
  errors?: string[];
};

export async function verifyTurnstile(token: string | null | undefined, remoteIp?: string | null): Promise<TurnstileResult> {
  if (!env.TURNSTILE_SECRET_KEY) {
    return {
      ok: env.NODE_ENV !== "production",
      errors: env.NODE_ENV === "production" ? ["turnstile-not-configured"] : []
    };
  }

  if (!token) {
    return {
      ok: false,
      errors: ["missing-turnstile-token"]
    };
  }

  const body = new URLSearchParams({
    secret: env.TURNSTILE_SECRET_KEY,
    response: token
  });

  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    return {
      ok: false,
      errors: ["turnstile-network-error"]
    };
  }

  const payload = (await response.json()) as { success: boolean; "error-codes"?: string[] };
  return {
    ok: payload.success,
    errors: payload["error-codes"]
  };
}
