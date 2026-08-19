// Core ingestion abstraction.
//
// IMPORTANT: this is the ONLY place a "media source" enters the system.
// Every adapter here operates on content the platform is authorized to
// retrieve. There is intentionally no adapter that extracts arbitrary
// public URLs from TikTok/Instagram/Facebook/YouTube — see docs/ARCHITECTURE.md.

export type SourceKind =
  | "upload"
  | "direct-url"
  | "oauth-own-content"
  | "cloud-storage";

export interface RequestContext {
  requestId: string;
  ip: string;
  userId?: string;
  accountConnections?: Partial<Record<PlatformId, OAuthConnection>>;
}

export type PlatformId = "youtube" | "tiktok" | "instagram" | "facebook";

export interface OAuthConnection {
  platform: PlatformId;
  accountId: string;
  scopes: string[];
  tokenRef: string;
  expiresAt: string;
}

export interface MediaSourceRequest {
  kind: SourceKind;
  uploadRef?: string;
  url?: string;
  platform?: PlatformId;
  ownMediaId?: string;
  targetFormat: "mp4" | "mp3" | "webm" | "m4a";
  targetQuality?: "source" | "1080p" | "720p" | "480p" | "audio-only";
}

export type RejectionReason =
  | "NO_AUTHORIZED_SOURCE"
  | "INVALID_URL"
  | "UNSUPPORTED_FORMAT"
  | "FILE_TOO_LARGE"
  | "SSRF_BLOCKED"
  | "OAUTH_NOT_CONNECTED"
  | "OAUTH_TOKEN_EXPIRED"
  | "RATE_LIMITED";

export interface AuthorizationResult {
  authorized: boolean;
  reason?: RejectionReason;
  explanation?: string;
}

export interface IngestedMedia {
  localPath: string;
  sizeBytes: number;
  mimeType: string;
  durationSeconds?: number;
  sourceDescription: string;
}

export interface AdapterHealth {
  id: string;
  healthy: boolean;
  successRate: number;
  averageLatencyMs: number;
  lastError?: string;
  lastCheckedAt: string;
}

export interface IngestionAdapter {
  id: string;
  canHandle(source: MediaSourceRequest): boolean;
  authorize(
    source: MediaSourceRequest,
    ctx: RequestContext
  ): Promise<AuthorizationResult>;
  ingest(
    source: MediaSourceRequest,
    ctx: RequestContext
  ): Promise<IngestedMedia>;
  healthCheck(): Promise<AdapterHealth>;
}
