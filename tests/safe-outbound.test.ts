import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  lookup: vi.fn()
}));

vi.mock("node:dns/promises", () => ({
  lookup: mocks.lookup
}));

import {
  assertSafePublicUrl,
  readResponseBytesCapped,
  safeFetchPublicUrl,
  SafeOutboundError
} from "@/lib/safe-outbound";

describe("safe outbound fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects private DNS resolutions", async () => {
    mocks.lookup.mockResolvedValueOnce([{ address: "10.0.0.5", family: 4 }]);

    await expect(assertSafePublicUrl("https://example.com/file.txt", "Import URL")).rejects.toMatchObject({
      message: "Import URL must point to a public host.",
      status: 400
    });
  });

  it("blocks redirects to private hosts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: {
          location: "http://127.0.0.1/internal"
        }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      safeFetchPublicUrl("https://example.com/file.txt", {
        label: "Remote upload URL"
      })
    ).rejects.toMatchObject({
      message: "Remote upload URL must point to a public host.",
      status: 400
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("caps streamed responses even without content-length", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(Uint8Array.from([1, 2, 3, 4]));
        controller.enqueue(Uint8Array.from([5, 6, 7, 8]));
        controller.close();
      }
    });

    const response = new Response(body, {
      status: 200,
      headers: {
        "content-type": "application/octet-stream"
      }
    });

    await expect(readResponseBytesCapped(response, 6, "Remote file")).rejects.toMatchObject({
      message: "Remote file is too large (max 6 bytes).",
      status: 413
    });
  });

  it("returns the final URL for safe responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await safeFetchPublicUrl("https://example.com/file.txt", {
      label: "Import URL"
    });

    expect(result.finalUrl.toString()).toBe("https://example.com/file.txt");
    expect(result.response.status).toBe(200);
  });

  it("exposes safe outbound errors with status codes", () => {
    const error = new SafeOutboundError("Blocked", 502);

    expect(error.message).toBe("Blocked");
    expect(error.status).toBe(502);
  });
});
