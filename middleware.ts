import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: ["/"]
};

const ASCII_BANNER = `
  _      ______  _  __     ____  _       
 | | /| / / __ \\| |/ /___ / __ )(_)___   
 | |/ |/ / /_/ /|   //___/ __  / / __ \\  
 |__/|__/\\____//_/|_|   /_____/_/_/ /_/  

  Simple, fast, secure pastebin & code sharing.

  USAGE:
    <command> | curl --data-binary @- https://wox-bin.vercel.app
    curl -F 'file=@filename.ext' https://wox-bin.vercel.app

  OPTIONS (via query params or headers):
    ?burn=1          Burn after reading (or Header: X-Burn: 1)
    ?expires=1h      Expires in: 10m, 1h, 1d, 7d, 30d (or Header: X-Expires: 1h)

  EXAMPLES:
    cat main.rs | curl --data-binary @- https://wox-bin.vercel.app
    curl -F 'file=@app.py' https://wox-bin.vercel.app?burn=1
    dmesg | curl --data-binary @- -H 'X-Expires: 1d' https://wox-bin.vercel.app

`;

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/") {
    if (request.method === "POST" || request.method === "PUT") {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = "/api/public/termbin";
      return NextResponse.rewrite(rewriteUrl);
    }

    if (request.method === "GET") {
      const userAgent = request.headers.get("user-agent") || "";
      const accept = request.headers.get("accept") || "";
      const isCli = /^(curl|wget|httpie)/i.test(userAgent.trim());
      const prefersText = !accept.includes("text/html");

      if (isCli && prefersText) {
        return new NextResponse(ASCII_BANNER, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=86400"
          }
        });
      }
    }
  }

  return NextResponse.next();
}
