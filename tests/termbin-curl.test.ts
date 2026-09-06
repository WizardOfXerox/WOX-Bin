import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rateLimit: vi.fn(),
  getRequestIp: vi.fn(),
  getAppOrigin: vi.fn(),
  createTextDrop: vi.fn()
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.rateLimit
}));

vi.mock("@/lib/request", () => ({
  getRequestIp: mocks.getRequestIp,
  getAppOrigin: mocks.getAppOrigin
}));

vi.mock("@/lib/public-drops", () => ({
  PublicDropError: class PublicDropError extends Error {
    status: number;
    constructor(message: string, status = 400) {
      super(message);
      this.status = status;
    }
  },
  createTextDrop: mocks.createTextDrop
}));

const termbinRoutePromise = import("@/app/api/public/termbin/route");

describe("POST /api/public/termbin (CLI pipe)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestIp.mockReturnValue("198.51.100.42");
    mocks.getAppOrigin.mockReturnValue("https://wox-bin.vercel.app");
    mocks.rateLimit.mockResolvedValue({ success: true });
    mocks.createTextDrop.mockResolvedValue({
      urlPath: "/t/drop-abc123"
    });
  });

  it("handles standard text uploads via stdin / --data-binary", async () => {
    const { POST } = await termbinRoutePromise;
    const response = await POST(
      new Request("https://wox-bin.vercel.app/api/public/termbin?burn=1&expires=1d", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          "User-Agent": "curl/8.4.0"
        },
        body: "echo 'hello terminal'"
      })
    );

    expect(response.status).toBe(201);
    const text = await response.text();
    expect(text).toBe("https://wox-bin.vercel.app/t/drop-abc123\n");
    expect(mocks.createTextDrop).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "echo 'hello terminal'",
        burnAfterRead: true,
        expires: "1d"
      })
    );
  });

  it("resolves options from X-Burn and X-Expires headers", async () => {
    const { POST } = await termbinRoutePromise;
    const response = await POST(
      new Request("https://wox-bin.vercel.app/api/public/termbin", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          "X-Burn": "1",
          "X-Expires": "7d"
        },
        body: "confidential config"
      })
    );

    expect(response.status).toBe(201);
    expect(mocks.createTextDrop).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "confidential config",
        burnAfterRead: true,
        expires: "7d"
      })
    );
  });

  it("handles multipart form data uploads (curl -F 'file=@filename.ext')", async () => {
    const formData = new FormData();
    formData.append("file", new File(["println!(\"Hello Rust\");"], "main.rs", { type: "text/plain" }));

    const { POST } = await termbinRoutePromise;
    const response = await POST(
      new Request("https://wox-bin.vercel.app/api/public/termbin", {
        method: "POST",
        body: formData
      })
    );

    expect(response.status).toBe(201);
    expect(mocks.createTextDrop).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "println!(\"Hello Rust\");"
      })
    );
  });
});
