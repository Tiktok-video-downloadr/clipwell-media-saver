import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type {
  AdapterHealth,
  AuthorizationResult,
  IngestedMedia,
  IngestionAdapter,
  MediaSourceRequest,
  RequestContext,
} from "../types";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024; // 2GB
const UPLOAD_STAGING_DIR = process.env.UPLOAD_STAGING_DIR ?? "/tmp/media-platform/uploads";

export const uploadAdapter: IngestionAdapter = {
  id: "upload",

  canHandle(source: MediaSourceRequest) {
    return source.kind === "upload" && !!source.uploadRef;
  },

  async authorize(source: MediaSourceRequest): Promise<AuthorizationResult> {
    if (!source.uploadRef) {
      return {
        authorized: false,
        reason: "NO_AUTHORIZED_SOURCE",
        explanation: "No uploaded file reference was provided.",
      };
    }

    const stagedPath = resolveStagedPath(source.uploadRef);
    try {
      const stat = await fs.stat(stagedPath);
      if (stat.size > MAX_UPLOAD_BYTES) {
        return {
          authorized: false,
          reason: "FILE_TOO_LARGE",
          explanation: `File exceeds the ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB limit.`,
        };
      }
      return { authorized: true };
    } catch {
      return {
        authorized: false,
        reason: "NO_AUTHORIZED_SOURCE",
        explanation: "Uploaded file could not be found (it may have expired).",
      };
    }
  },

  async ingest(source: MediaSourceRequest, ctx: RequestContext): Promise<IngestedMedia> {
    const stagedPath = resolveStagedPath(source.uploadRef!);
    const stat = await fs.stat(stagedPath);

    const workingPath = path.join(
      UPLOAD_STAGING_DIR,
      "processing",
      `${randomUUID()}${path.extname(stagedPath)}`
    );
    await fs.mkdir(path.dirname(workingPath), { recursive: true });
    await fs.copyFile(stagedPath, workingPath);

    return {
      localPath: workingPath,
      sizeBytes: stat.size,
      mimeType: guessMimeType(stagedPath),
      sourceDescription: `Uploaded file (request ${ctx.requestId})`,
    };
  },

  async healthCheck(): Promise<AdapterHealth> {
    try {
      await fs.access(UPLOAD_STAGING_DIR);
      return {
        id: "upload",
        healthy: true,
        successRate: 1,
        averageLatencyMs: 0,
        lastCheckedAt: new Date().toISOString(),
      };
    } catch {
      return {
        id: "upload",
        healthy: false,
        successRate: 0,
        averageLatencyMs: 0,
        lastError: "Upload staging directory unavailable",
        lastCheckedAt: new Date().toISOString(),
      };
    }
  },
};

function resolveStagedPath(uploadRef: string): string {
  const safeName = uploadRef.replace(/[^a-zA-Z0-9-_.]/g, "");
  return path.join(UPLOAD_STAGING_DIR, "incoming", safeName);
}

function guessMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".wav": "audio/wav",
  };
  return map[ext] ?? "application/octet-stream";
}
