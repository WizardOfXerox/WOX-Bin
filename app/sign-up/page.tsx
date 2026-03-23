"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { readTurnstileToken, resetTurnstileFields, TurnstileField } from "@/components/turnstile-field";

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      username: String(form.get("username") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      turnstileToken: readTurnstileToken(event.currentTarget),
      acceptTerms: form.get("acceptTerms") === "on"
    };

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Registration failed.");
      resetTurnstileFields(event.currentTarget);
      setLoading(false);
      return;
    }

    window.location.href = "/sign-in?emailVerify=pending";
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <Card className="w-full max-w-xl">
        <CardContent className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Join WOX-Bin</p>
            <h1 className="mt-2 text-3xl font-semibold">Create your account</h1>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input autoComplete="username" name="username" placeholder="Username" required />
            <Input autoComplete="email" name="email" placeholder="Email" type="email" required />
            <p className="-mt-2 text-xs text-muted-foreground">
              Email is required. You will need to verify it before you can sign in.
            </p>
            <Input autoComplete="new-password" name="password" placeholder="Password" type="password" required />
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-snug text-muted-foreground">
              <input
                required
                aria-required="true"
                className="mt-1 h-4 w-4 shrink-0 rounded border border-input bg-background accent-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                name="acceptTerms"
                type="checkbox"
              />
              <span>
                I have read and agree to the{" "}
                <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/terms">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/privacy">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            <TurnstileField siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" disabled={loading} type="submit">
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link className="text-primary" href="/sign-in">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
