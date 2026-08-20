import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { assertSafeToFetch, SsrfBlockedError } from "@/lib/security/ssrf";
import type {
  AdapterHealth,
  AuthorizationResult,
  IngestedMedia,
  IngestionAdapter,
  MediaSourceRequest,
  RequestContext,
} from "../types";

const MAX_DOWNLOAD_BYTES = 2 * 1024 * 1024 * 1024; // 2GB
const FETCH_TIMEOUT_MS = 30_000;
const STAGING_DIR = process.env.DIRECT_URL_STAGING_DIR ?? "/tmp/media-platform/direct-url";

const DISALLOWED_HOST_SUFFIXES = [
  "tiktok.com",
  "instagram.com",
  "facebook.com",
  "fb.watch",
  "youtube.com",
  "youtu.be",
];

export const directUrlAdapter: IngestionAdapter = {
  id: "direct-url",

  canHandle(source: MediaSourceRequest) {
    return source.kind === "direct-url" && !!source.url;
  },

  async authorize(source: MediaSourceRequest): Promise<AuthorizationResult> {
    if (!source.url) {
      return { authorized: false, reason: "INVALID_URL", explanation: "No URL provided." };
    }

    let parsed: URL;
    try {
      parsed = await assertSafeToFetch(source.url);
    } catch (err) {
      if (err instanceof SsrfBlockedError) {
        return { authorized: false, reason: "SSRF_BLOCKED", explanation: err.message };
      }
      return { authorized: false, reason: "INVALID_URL", explanation: "Invalid URL." };
    }

    const host = parsed.hostname.toLowerCase();
    if (DISALLOWED_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))) {
      return {
        authorized: false,
        reason: "NO_AUTHORIZED_SOURCE",
        explanation:
          "This platform isn't supported through direct-URL fetch. Connect your account instead to export your own content through the official API.",
      };
    }

    try {
      const head = await fetchWithTimeout(parsed.toString(), { method: "HEAD" });
      const contentLength = Number(head.headers.get("content-length") ?? 0);
      if (contentLength > MAX_DOWNLOAD_BYTES) {
        return {
          authorized: false,
          reason: "FILE_TOO_LARGE",
          explanation: "File exceeds the maximum allowed size.",
        };
      }
    } catch {
      // Some hosts don't support HEAD — fall through and enforce the cap
      // during the actual streamed download instead.
    }

    return { authorized: true };
  },

  async ingest(source: MediaSourceRequest, ctx: RequestContext): Promise<IngestedMedia> {
    const parsed = await assertSafeToFetch(source.url!);
    const res = await fetchWithTimeout(parsed.toString(), { method: "GET" });

    if (!res.ok || !res.body) {
      throw new Error(`Fetch failed with status ${res.status}`);
    }

    await fs.mkdir(STAGING_DIR, { recursive: true });
    const ext = guessExtFromContentType(res.headers.get("content-type"));
    const localPath = path.join(STAGING_DIR, `${randomUUID()}${ext}`);

    let bytesWritten = 0;
    const capped = new Readable.from(
      (async function* () {
        for await (const chunk of res.body as any) {
          bytesWritten += chunk.length;
          if (bytesWritten > MAX_DOWNLOAD_BYTES) {
            throw new Error("Download exceeded maximum allowed size");
          }
          yield chunk;
        }
      })()
    );

    await pipeline(capped, createWriteStream(localPath));

    return {
      localPath,
      sizeBytes: bytesWritten,
      mimeType: res.headers.get("content-type") ?? "application/octet-stream",
      sourceDescription: `Direct URL (request ${ctx.requestId}): ${parsed.hostname}`,
    };
  },

  async healthCheck(): Promise<AdapterHealth> {
    return {
      id: "direct-url",
      healthy: true,
      successRate: 1,
      averageLatencyMs: 0,
      lastCheckedAt: new Date().toISOString(),
    };
  },
};

const MAX_REDIRECTS = 5;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  let currentUrl = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(currentUrl, { ...init, signal: controller.signal, redirect: "manual" });
    } finally {
      clearTimeout(timeout);
    }

    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      const nextUrl = new URL(res.headers.get("location")!, currentUrl).toString();
      await assertSafeToFetch(nextUrl);
      currentUrl = nextUrl;
      continue;
    }

    return res;
  }
  throw new Error("Too many redirects");
}

function guessExtFromContentType(contentType: string | null): string {
  if (!contentType) return ".bin";
  if (contentType.includes("mp4")) return ".mp4";
  if (contentType.includes("webm")) return ".webm";
  if (contentType.includes("quicktime")) return ".mov";
  if (contentType.includes("mpeg")) return ".mp3";
  return ".bin";
}
