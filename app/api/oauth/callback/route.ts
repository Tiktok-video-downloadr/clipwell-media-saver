import { NextRequest, NextResponse } from "next/server";
import { OAUTH_CONFIG } from "@/lib/oauth/config";
import { logger } from "@/lib/observability/logger";
import type { PlatformId } from "@/lib/ingestion/types";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/?oauth_error=${encodeURIComponent(error)}`, req.url));
  }

  if (!code || !state || !state.includes(":")) {
    return NextResponse.json({ error: "INVALID_CALLBACK" }, { status: 400 });
  }

  const [platform, stateToken] = state.split(":") as [PlatformId, string];
  if (!(platform in OAUTH_CONFIG)) {
    return NextResponse.json({ error: "UNKNOWN_PLATFORM" }, { status: 400 });
  }

  const cookieState = req.cookies.get(`oauth_state_${platform}`)?.value;
  if (!cookieState || cookieState !== stateToken) {
    return NextResponse.json({ error: "STATE_MISMATCH" }, { status: 400 });
  }

  try {
    const token = await exchangeCodeForToken(platform, code, req.url);
    await saveConnectionForUser(platform, token);

    const res = NextResponse.redirect(new URL(`/${platform}-downloader?connected=1`, req.url));
    res.cookies.delete(`oauth_state_${platform}`);
    return res;
  } catch (err) {
    logger.error("oauth callback failed", {
      platform,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.redirect(
      new URL(`/${platform}-downloader?error=connection_failed`, req.url)
    );
  }
}

interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
}

async function exchangeCodeForToken(
  platform: PlatformId,
  _code: string,
  _requestUrl: string
): Promise<TokenResponse> {
  throw new Error(
    `Token exchange for ${platform} is not implemented yet. ` +
      `Register an app with ${platform} and implement the real POST to ${OAUTH_CONFIG[platform].tokenUrl} here.`
  );
}

async function saveConnectionForUser(_platform: PlatformId, _token: TokenResponse): Promise<void> {
  throw new Error("Connection persistence is not implemented yet.");
}
