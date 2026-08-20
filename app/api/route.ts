import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import IORedis from "ioredis";
import { z } from "zod";
import { ingestionRegistry } from "@/lib/ingestion/registry";
import { enqueueProcessingJob } from "@/lib/queue/queue";
import { RateLimiter, RATE_LIMIT_POLICIES } from "@/lib/security/rateLimit";
import { trackFunnelEvent } from "@/lib/observability/metrics";
import { logger } from "@/lib/observability/logger";
import type { RequestContext } from "@/lib/ingestion/types";

const redis = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379");
const rateLimiter = new RateLimiter(redis);

const JobRequestSchema = z.object({
  kind: z.enum(["upload", "direct-url", "oauth-own-content", "cloud-storage"]),
  uploadRef: z.string().max(200).optional(),
  url: z.string().url().max(2048).optional(),
  platform: z.enum(["youtube", "tiktok", "instagram", "facebook"]).optional(),
  ownMediaId: z.string().max(200).optional(),
  targetFormat: z.enum(["mp4", "mp3", "webm", "m4a", "mov"]),
  targetQuality: z.enum(["source", "1080p", "720p", "480p", "audio-only"]).optional(),
  generateThumbnail: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const ipLimit = await rateLimiter.check(`ip:${ip}`, RATE_LIMIT_POLICIES.perIpPerMinute);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "RATE_LIMITED", message: "Too many requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(ipLimit.resetAtSeconds) } }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = JobRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "Request failed validation.", issues: parsed.error.issues },
      { status: 400 }
    );
