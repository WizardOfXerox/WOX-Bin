import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  if (session.user.onboardingComplete && session.user.username) {
    redirect("/app");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">One last step</p>
            <h1 className="mt-2 text-3xl font-semibold">Choose your public username</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This username appears on your public pastes, comments, and feed entries.
            </p>
          </div>
          <form action="/api/account/onboarding" className="space-y-4" method="post">
            <Input autoComplete="username" name="username" placeholder="e.g. woxbuilder" required />
            <Button className="w-full" type="submit">
              Save username
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
