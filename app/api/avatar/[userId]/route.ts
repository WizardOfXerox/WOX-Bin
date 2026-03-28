import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { parseStoredAvatarDataUrl } from "@/lib/avatar";

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { userId } = await context.params;

  const row = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      image: true
    }
  });

  if (!row?.image) {
    return new Response("Not found.\n", { status: 404 });
  }

  const parsed = parseStoredAvatarDataUrl(row.image);
  if (!parsed) {
    return new Response("Not found.\n", { status: 404 });
  }

  const body = Buffer.from(parsed.base64, "base64");

  return new Response(new Uint8Array(body), {
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      "Content-Length": String(body.length),
      "Content-Type": parsed.mimeType,
      "X-Content-Type-Options": "nosniff"
    }
  });
}
