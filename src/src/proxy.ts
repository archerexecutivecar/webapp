import { NextResponse, type NextRequest } from "next/server";

/* Client-review gate. Both features are driven by environment variables so
   nothing secret lives in the repo; with none set the site behaves normally.
   - BASIC_AUTH_USER / BASIC_AUTH_PASS : require HTTP basic auth
   - REVIEW_MODE=1                      : send X-Robots-Tag: noindex */
export function proxy(req: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;

  if (user && pass) {
    const header = req.headers.get("authorization") ?? "";
    const [scheme, encoded] = header.split(" ");
    let ok = false;
    if (scheme === "Basic" && encoded) {
      const decoded = atob(encoded);
      const idx = decoded.indexOf(":");
      ok = idx > -1 && decoded.slice(0, idx) === user && decoded.slice(idx + 1) === pass;
    }
    if (!ok) {
      return new NextResponse("Authentication required.", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Archer review", charset="UTF-8"' },
      });
    }
  }

  const res = NextResponse.next();
  if (process.env.REVIEW_MODE === "1") res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
