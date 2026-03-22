import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <Card className="w-full max-w-xl">
        <CardContent className="space-y-6 text-center">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Not found</p>
            <h1 className="mt-2 text-3xl font-semibold">That paste or page could not be found</h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              It may have expired, been burned after reading, been removed by moderation, or the link may be incomplete.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/">Back home</Link>
            </Button>
            <Button asChild>
              <Link href="/app">Open workspace</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
