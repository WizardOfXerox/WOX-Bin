"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() })
    });

    const body = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;

    if (!response.ok) {
      setError(body?.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    setMessage(body?.message ?? "Check your email for the next steps.");
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Account</p>
            <h1 className="mt-2 text-3xl font-semibold">Forgot password</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Enter the email on your account. If it matches a user who signed up with a password (not Google-only), we
              will send a reset link. You must have added an email at registration.
            </p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              autoComplete="email"
              name="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p> : null}
            <Button className="w-full" disabled={loading} type="submit">
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground">
            <Link className="text-primary" href="/sign-in">
              ← Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
