import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type { MediaSourceRequest } from "@/lib/ingestion/types";

const OUTPUT_DIR = process.env.PROCESSED_OUTPUT_DIR ?? "/tmp/media-platform/output";
const MAX_DURATION_SECONDS = 60 * 60 * 3;
const FFMPEG_TIMEOUT_MS = 10 * 60 * 1000;

export interface TranscodeResult {
  outputPath: string;
  sizeBytes: number;
  durationSeconds: number;
  thumbnailPath?: string;
}

export async function transcode(
  inputPath: string,
  target: Pick<MediaSourceRequest, "targetFormat" | "targetQuality" | "generateThumbnail">
): Promise<TranscodeResult> {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const durationSeconds = await probeDuration(inputPath);
  if (durationSeconds > MAX_DURATION_SECONDS) {
    throw new ProcessingError(
      "DURATION_EXCEEDED",
      `Source duration ${durationSeconds}s exceeds the ${MAX_DURATION_SECONDS}s limit.`
    );
  }

  const outputPath = path.join(OUTPUT_DIR, `${randomUUID()}${extFor(target.targetFormat)}`);
  const args = buildFfmpegArgs(inputPath, outputPath, target);

  await runWithTimeout("ffmpeg", args, FFMPEG_TIMEOUT_MS);

  const stat = await fs.stat(outputPath);

  let thumbnailPath: string | undefined;
  const isAudioOnly = target.targetFormat === "mp3" || target.targetFormat === "m4a";
  if (target.generateThumbnail && !isAudioOnly) {
    thumbnailPath = await generateThumbnail(inputPath, durationSeconds);
  }

  return { outputPath, sizeBytes: stat.size, durationSeconds, thumbnailPath };
}

async function generateThumbnail(inputPath: string, durationSeconds: number): Promise<string> {
  const thumbnailPath = path.join(OUTPUT_DIR, `${randomUUID()}.jpg`);
  const seekSeconds = Math.min(Math.max(durationSeconds * 0.1, 0), Math.max(durationSeconds - 1, 0));
  await runWithTimeout(
    "ffmpeg",
    ["-y", "-ss", String(seekSeconds), "-i", inputPath, "-frames:v", "1", "-q:v", "3", thumbnailPath],
    30_000
  );
  return thumbnailPath;
}

export class ProcessingError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "ProcessingError";
  }
}

function buildFfmpegArgs(
  inputPath: string,
  outputPath: string,
  target: Pick<MediaSourceRequest, "targetFormat" | "targetQuality">
): string[] {
  const args = ["-y", "-i", inputPath, "-nostdin", "-hide_banner"];

  if (target.targetFormat === "mp3" || target.targetFormat === "m4a") {
    args.push("-vn", "-acodec", target.targetFormat === "mp3" ? "libmp3lame" : "aac", "-b:a", "192k");
  } else {
    const videoCodec = target.targetFormat === "webm" ? "libvpx-vp9" : "libx264";
    const audioCodec = target.targetFormat === "webm" ? "libopus" : "aac";
    args.push("-c:v", videoCodec, "-preset", "veryfast", "-crf", "23", "-c:a", audioCodec, "-b:a", "128k");

    const scale = resolutionFilter(target.targetQuality);
    if (scale) args.push("-vf", scale);
  }

  args.push("-threads", "2");
  args.push(outputPath);
  return args;
}

function resolutionFilter(quality?: string): string | null {
  switch (quality) {
    case "1080p":
      return "scale=-2:1080";
    case "720p":
      return "scale=-2:720";
    case "480p":
      return "scale=-2:480";
    default:
      return null;
  }
}

function extFor(format: MediaSourceRequest["targetFormat"]): string {
  return { mp4: ".mp4", webm: ".webm", mp3: ".mp3", m4a: ".m4a", mov: ".mov" }[format];
}

async function probeDuration(inputPath: string): Promise<number> {
  const output = await runCapture("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    inputPath,
  ]);
  const seconds = parseFloat(output.trim());
  return Number.isFinite(seconds) ? seconds : 0;
}

function runWithTimeout(cmd: string, args: string[], timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 50_000) stderr = stderr.slice(-50_000);
    });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new ProcessingError("TIMEOUT", `${cmd} exceeded ${timeoutMs}ms and was killed`));
    }, timeoutMs);

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new ProcessingError("FFMPEG_FAILED", `ffmpeg exited ${code}: ${stderr.slice(-2000)}`));
    });
  });
}

function runCapture(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "ignore"] });
    let stdout = "";
    child.stdout.on("data", (c) => (stdout += c.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${cmd} exited ${code}`));
    });
  });
  }
