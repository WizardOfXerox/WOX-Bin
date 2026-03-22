import { NextResponse } from "next/server";

import { TOOLS_DISABLED_COPY } from "@/lib/tools/availability";

export function toolsDisabledResponse() {
  return NextResponse.json(
    {
      error: TOOLS_DISABLED_COPY.apiError,
      code: "TOOLS_DISABLED"
    },
    {
      status: 503,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
