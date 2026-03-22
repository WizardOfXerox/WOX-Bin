"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (!token) {
      setError("Missing reset token. Open the link from your email.");
      return;
    }

    setLoading(true);

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password })
    });

    const body = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(body?.error ?? "Could not reset password.");
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
  }

  if (!token) {
    return (
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-4 pt-6">
          <p className="text-sm text-muted-foreground">
            This page needs a valid reset link. Request a new one and open the URL from your email.
          </p>
          <Button asChild variant="outline">
            <Link href="/forgot-password">Request reset link</Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            <Link className="text-primary" href="/sign-in">
              ← Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  if (done) {
    return (
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-4 pt-6">
          <p className="font-medium text-foreground">Password updated</p>
          <p className="text-sm text-muted-foreground">You can sign in with your new password.</p>
          <Button asChild className="w-full">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg">
      <CardContent className="space-y-6 pt-6">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Account</p>
          <h1 className="mt-2 text-3xl font-semibold">Choose a new password</h1>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            autoComplete="new-password"
            minLength={8}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password (min 8 characters)"
            required
            type="password"
            value={password}
          />
          <Input
            autoComplete="new-password"
            minLength={8}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            required
            type="password"
            value={confirm}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button className="w-full" disabled={loading} type="submit">
            {loading ? "Saving…" : "Update password"}
          </Button>
        </form>
        <p className="text-sm text-muted-foreground">
          <Link className="text-primary" href="/sign-in">
            ← Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <Suspense
        fallback={
          <Card className="w-full max-w-lg">
            <CardContent className="p-6 text-sm text-muted-foreground">Loading…</CardContent>
          </Card>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
