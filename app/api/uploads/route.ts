import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import IORedis from "ioredis";
import { RateLimiter, RATE_LIMIT_POLICIES } from "@/lib/security/rateLimit";
import { logger } from "@/lib/observability/logger";

const redis = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379");
const rateLimiter = new RateLimiter(redis);

const UPLOAD_STAGING_DIR = process.env.UPLOAD_STAGING_DIR ?? "/tmp/media-platform/uploads";
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;

const ALLOWED_MIME_PREFIXES = ["video/", "audio/"];

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const limit = await rateLimiter.check(`upload:${ip}`, RATE_LIMIT_POLICIES.perIpPerMinute);
  if (!limit.allowed) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "FILE_TOO_LARGE", message: `Max upload size is ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB.` },
      { status: 413 }
    );
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "INVALID_REQUEST", message: "No file provided." }, { status: 400 });
  }

  if (!ALLOWED_MIME_PREFIXES.some((p) => file.type.startsWith(p))) {
    return NextResponse.json(
      { error: "UNSUPPORTED_FORMAT", message: "Only video and audio files are accepted." },
      { status: 415 }
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 413 });
  }

  await fs.mkdir(path.join(UPLOAD_STAGING_DIR, "incoming"), { recursive: true });

  const uploadRef = randomUUID();
  const ext = safeExtFromMime(file.type);
  const destPath = path.join(UPLOAD_STAGING_DIR, "incoming", `${uploadRef}${ext}`);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(destPath, buffer);

  logger.info("file uploaded", { uploadRef, sizeBytes: buffer.length, ip });

  return NextResponse.json({ uploadRef: `${uploadRef}${ext}` }, { status: 201 });
}

function safeExtFromMime(mime: string): string {
  const map: Record<string, string> = {
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "audio/wav": ".wav",
  };
  return map[mime] ?? ".bin";
}
