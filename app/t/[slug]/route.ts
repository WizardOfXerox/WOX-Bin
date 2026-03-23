import { NextResponse } from "next/server";

import { buildDropResponse, getDropForServe, incrementDropView } from "@/lib/public-drops";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;
  const row = await getDropForServe(slug);
  if (!row || row.kind !== "text") {
    return new NextResponse("Paste not found.\n", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8"
      }
    });
  }

  const url = new URL(request.url);
  const response = buildDropResponse(row, {
    download: url.searchParams.get("download") === "1"
  });
  await incrementDropView(row);
  return response;
}
