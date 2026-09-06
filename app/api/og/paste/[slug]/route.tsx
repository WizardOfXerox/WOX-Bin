import { ImageResponse } from "next/og";
import { getPasteForViewer } from "@/lib/paste-service";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;

  const result = await getPasteForViewer({
    slug,
    viewer: { id: null, role: null },
    trackView: false
  });

  const headers = {
    "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400"
  };

  if (!result.paste) {
    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#090d16",
            backgroundImage: "radial-gradient(circle at 50% 40%, rgba(56, 189, 248, 0.12), transparent 60%)",
            color: "#ffffff",
            fontFamily: "sans-serif"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 20px",
              borderRadius: "9999px",
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              fontSize: 18,
              color: "#94a3b8",
              marginBottom: "24px"
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ef4444" }} />
            <span>WOX-Bin • Paste Not Available</span>
          </div>
          <div style={{ fontSize: 44, fontWeight: 700, color: "#f8fafc", marginBottom: 12 }}>
            Paste Not Found or Expired
          </div>
          <div style={{ fontSize: 20, color: "#64748b" }}>
            This snippet may have expired, been burned, or is private.
          </div>
        </div>
      ),
      { width: 1200, height: 630, headers }
    );
  }

  const isLocked = result.locked || result.paste.secretMode || result.paste.encryptedShare;
  const title = result.paste.title?.trim() || slug;
  const author = result.paste.author?.displayName || result.paste.author?.username || "Anonymous";
  const language = result.paste.language && result.paste.language !== "none" ? result.paste.language.toUpperCase() : "PLAINTEXT";
  const fileCount = result.paste.files?.length || 0;
  const starCount = result.paste.stars || 0;
  const viewCount = result.paste.viewCount || 0;

  if (isLocked) {
    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#090d16",
            backgroundImage: "radial-gradient(circle at 50% 35%, rgba(168, 85, 247, 0.15), transparent 60%)",
            color: "#ffffff",
            fontFamily: "sans-serif"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px 18px",
              borderRadius: "9999px",
              backgroundColor: "rgba(168, 85, 247, 0.15)",
              border: "1px solid rgba(168, 85, 247, 0.35)",
              fontSize: 16,
              color: "#c084fc",
              marginBottom: "28px"
            }}
          >
            <span>🔒 Zero-Knowledge Protected</span>
          </div>
          <div
            style={{
              fontSize: 46,
              fontWeight: 700,
              color: "#f8fafc",
              marginBottom: 14,
              maxWidth: "900px",
              textAlign: "center",
              lineHeight: 1.2
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 20, color: "#94a3b8", marginBottom: 36 }}>
            Shared securely on WOX-Bin • Decryption required to view
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
              fontSize: 16,
              color: "#64748b"
            }}
          >
            <span>Author: @{author}</span>
            <span>•</span>
            <span>Client-side AES-256-GCM / Password Protected</span>
          </div>
        </div>
      ),
      { width: 1200, height: 630, headers }
    );
  }

  const rawLines = result.paste.content.split("\n");
  const previewLines = rawLines.slice(0, 9);
  if (rawLines.length > 9) {
    previewLines.push(`// ... and ${rawLines.length - 9} more lines`);
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#070b14",
          backgroundImage: "radial-gradient(circle at 80% 20%, rgba(34, 211, 238, 0.12), transparent 50%), radial-gradient(circle at 20% 80%, rgba(139, 92, 246, 0.12), transparent 50%)",
          padding: "48px 56px",
          color: "#ffffff",
          fontFamily: "sans-serif"
        }}
      >
        {/* Top bar: Window dots + Header info */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: "#ef4444" }} />
              <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: "#f59e0b" }} />
              <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: "#10b981" }} />
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: "#f8fafc",
                maxWidth: "680px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
            >
              {title}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "6px 14px",
                borderRadius: "8px",
                backgroundColor: "rgba(34, 211, 238, 0.12)",
                border: "1px solid rgba(34, 211, 238, 0.35)",
                color: "#38bdf8",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.05em"
              }}
            >
              {language}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "6px 14px",
                borderRadius: "8px",
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#94a3b8",
                fontSize: 14
              }}
            >
              by @{author}
            </div>
          </div>
        </div>

        {/* Code Canvas Container */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            margin: "24px 0",
            backgroundColor: "rgba(10, 16, 28, 0.8)",
            borderRadius: "16px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "20px 24px",
            boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.5)",
            fontFamily: "monospace",
            fontSize: 17,
            lineHeight: 1.5,
            overflow: "hidden"
          }}
        >
          {previewLines.map((line, idx) => (
            <div key={idx} style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
              <span
                style={{
                  width: "28px",
                  color: "#475569",
                  textAlign: "right",
                  userSelect: "none",
                  fontSize: 15
                }}
              >
                {idx + 1}
              </span>
              <span
                style={{
                  color: line.startsWith("//") ? "#64748b" : "#e2e8f0",
                  whiteSpace: "pre",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
              >
                {line.slice(0, 85) || " "}
              </span>
            </div>
          ))}
        </div>

        {/* Footer: Stats + Branding */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px", fontSize: 16, color: "#64748b" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              ★ {starCount}
            </span>
            <span>•</span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              👁 {viewCount}
            </span>
            {fileCount > 0 && (
              <>
                <span>•</span>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  📁 {fileCount} {fileCount === 1 ? "attachment" : "attachments"}
                </span>
              </>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: "#22d3ee",
                boxShadow: "0 0 10px #22d3ee"
              }}
            />
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "#f8fafc" }}>
              WOX-Bin
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers }
  );
}
