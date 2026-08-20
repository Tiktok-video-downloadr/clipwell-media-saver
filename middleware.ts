import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const configured = process.env.ADMIN_BASIC_AUTH;
  if (!configured) {
    return NextResponse.json(
      { error: "ADMIN_NOT_CONFIGURED", message: "Set ADMIN_BASIC_AUTH to enable /admin." },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get("authorization");
  const expected = "Basic " + Buffer.from(configured).toString("base64");

  if (authHeader !== expected) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="admin"' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
