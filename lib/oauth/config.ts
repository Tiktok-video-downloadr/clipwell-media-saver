import type { PlatformId } from "@/lib/ingestion/types";

export interface OAuthPlatformConfig {
  platform: PlatformId;
  authorizeUrl: string;
  tokenUrl: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  scopes: string[];
}

export const OAUTH_CONFIG: Record<PlatformId, OAuthPlatformConfig> = {
  youtube: {
    platform: "youtube",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientIdEnv: "YOUTUBE_OAUTH_CLIENT_ID",
    clientSecretEnv: "YOUTUBE_OAUTH_CLIENT_SECRET",
    scopes: ["https://www.googleapis.com/auth/youtube.readonly"],
  },
  tiktok: {
    platform: "tiktok",
    authorizeUrl: "https://www.tiktok.com/v2/auth/authorize",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token",
    clientIdEnv: "TIKTOK_OAUTH_CLIENT_KEY",
    clientSecretEnv: "TIKTOK_OAUTH_CLIENT_SECRET",
    scopes: ["user.info.basic", "video.list"],
  },
  instagram: {
    platform: "instagram",
    authorizeUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    clientIdEnv: "META_OAUTH_APP_ID",
    clientSecretEnv: "META_OAUTH_APP_SECRET",
    scopes: ["instagram_basic", "instagram_content_publish"],
  },
  facebook: {
    platform: "facebook",
    authorizeUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    clientIdEnv: "META_OAUTH_APP_ID",
    clientSecretEnv: "META_OAUTH_APP_SECRET",
    scopes: ["pages_show_list", "pages_read_engagement"],
  },
};

export function isPlatformConfigured(platform: PlatformId): boolean {
  const cfg = OAUTH_CONFIG[platform];
  return Boolean(process.env[cfg.clientIdEnv] && process.env[cfg.clientSecretEnv]);
}
