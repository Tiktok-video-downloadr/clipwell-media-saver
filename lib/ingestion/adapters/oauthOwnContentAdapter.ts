import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  AdapterHealth,
  AuthorizationResult,
  IngestedMedia,
  IngestionAdapter,
  MediaSourceRequest,
  PlatformId,
  RequestContext,
} from "../types";

const STAGING_DIR = process.env.OAUTH_STAGING_DIR ?? "/tmp/media-platform/oauth";

/**
 * MOCK adapter for "export my own content via the platform's official API".
 * Swap mockFetchOwnMedia for a real, token-scoped API call once you've
 * registered an app and reviewed each platform's current terms.
 */
export function createOAuthOwnContentAdapter(platform: PlatformId): IngestionAdapter {
  return {
    id: `oauth-own-content:${platform}`,

    canHandle(source: MediaSourceRequest) {
      return source.kind === "oauth-own-content" && source.platform === platform;
    },

    async authorize(
      source: MediaSourceRequest,
      ctx: RequestContext
    ): Promise<AuthorizationResult> {
      const connection = ctx.accountConnections?.[platform];

      if (!connection) {
        return {
          authorized: false,
          reason: "OAUTH_NOT_CONNECTED",
          explanation: `Connect your ${platformLabel(platform)} account to export your own uploads.`,
        };
      }

      if (new Date(connection.expiresAt).getTime() < Date.now()) {
        return {
          authorized: false,
          reason: "OAUTH_TOKEN_EXPIRED",
          explanation: `Your ${platformLabel(platform)} connection expired. Reconnect to continue.`,
        };
      }

      if (!source.ownMediaId) {
        return {
          authorized: false,
          reason: "NO_AUTHORIZED_SOURCE",
          explanation: "No media selected from your connected account.",
        };
      }

      return { authorized: true };
    },

    async ingest(source: MediaSourceRequest, ctx: RequestContext): Promise<IngestedMedia> {
      const connection = ctx.accountConnections![platform]!;

      const mock = await mockFetchOwnMedia(platform, connection.accountId, source.ownMediaId!);

      await fs.mkdir(STAGING_DIR, { recursive: true });
      const localPath = path.join(STAGING_DIR, `${randomUUID()}.mp4`);
      await fs.writeFile(localPath, mock.bytes);

      return {
        localPath,
        sizeBytes: mock.bytes.length,
        mimeType: "video/mp4",
        durationSeconds: mock.durationSeconds,
        sourceDescription: `${platformLabel(platform)} account ${connection.accountId}, own media ${source.ownMediaId} (request ${ctx.requestId})`,
      };
    },

    async healthCheck(): Promise<AdapterHealth> {
      return {
        id: `oauth-own-content:${platform}`,
        healthy: true,
        successRate: 1,
        averageLatencyMs: 120,
        lastCheckedAt: new Date().toISOString(),
      };
    },
  };
}

function platformLabel(platform: PlatformId): string {
  return { youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram", facebook: "Facebook" }[
    platform
  ];
}

async function mockFetchOwnMedia(
  platform: PlatformId,
  accountId: string,
  ownMediaId: string
): Promise<{ bytes: Buffer; durationSeconds: number }> {
  await new Promise((r) => setTimeout(r, 150));
  return { bytes: Buffer.from(`mock-media:${platform}:${accountId}:${ownMediaId}`), durationSeconds: 30 };
}
