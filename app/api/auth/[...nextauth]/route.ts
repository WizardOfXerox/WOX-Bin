import { NextResponse } from "next/server";

import { handlers } from "@/auth";

type RouteContext = {
  params: Promise<{
    nextauth?: string[];
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const params = await context.params;
  if (params.nextauth?.[0] === "callback" && params.nextauth?.[1] === "credentials") {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return handlers.GET(request, context as never);
}

export const POST = handlers.POST;
