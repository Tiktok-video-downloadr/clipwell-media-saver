import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { OAUTH_CONFIG, isPlatformConfigured } from "@/lib/oauth/config";
import type { PlatformId } from "@/lib/ingestion/types";

const VALID_PLATFORMS: PlatformId[] = ["youtube", "tiktok", "instagram", "facebook"];

export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform: platformParam } = await params;
  const platform = platformParam as PlatformId;

  if (!VALID_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: "UNKNOWN_PLATFORM" }, { status: 404 });
  }

  if (!isPlatformConfigured(platform)) {
    return NextResponse.redirect(
      new URL(`/${platform}-downloader?error=not_configured`, req.url)
    );
  }

  const cfg = OAUTH_CONFIG[platform];
  const clientId = process.env[cfg.clientIdEnv]!;
  const redirectUri = new URL("/api/oauth/callback", req.url).toString();
  const state = randomUUID();

  const authUrl = new URL(cfg.authorizeUrl);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", cfg.scopes.join(" "));
  authUrl.searchParams.set("state", `${platform}:${state}`);
  authUrl.searchParams.set("response_type", "code");

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(`oauth_state_${platform}`, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
