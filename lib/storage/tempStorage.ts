import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { logger } from "@/lib/observability/logger";

const DELIVERY_DIR = process.env.DELIVERY_DIR ?? "/tmp/media-platform/delivery";
const TTL_SECONDS = Number(process.env.TEMP_STORAGE_TTL_SECONDS ?? 30 * 60);
const SIGNING_SECRET = process.env.DOWNLOAD_SIGNING_SECRET ?? "dev-secret-change-me";

export async function uploadToTempStorage(
  localPath: string,
  requestId: string
): Promise<{ downloadUrl: string; expiresAt: string }> {
  await fs.mkdir(DELIVERY_DIR, { recursive: true });
  const fileId = crypto.randomUUID();
  const destPath = path.join(DELIVERY_DIR, `${fileId}${path.extname(localPath)}`);
  await fs.copyFile(localPath, destPath);

  const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000);
  const signature = sign(fileId, expiresAt.getTime());

  const downloadUrl = `/api/download/${fileId}?exp=${expiresAt.getTime()}&sig=${signature}`;
  logger.info("uploaded to temp storage", { requestId, fileId, expiresAt: expiresAt.toISOString() });

  return { downloadUrl, expiresAt: expiresAt.toISOString() };
}

export function verifySignedDownload(fileId: string, exp: string, sig: string): boolean {
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum < Date.now()) return false;
  const expected = sign(fileId, expNum);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

export function resolveDeliveryPath(fileId: string): string {
  const safe = fileId.replace(/[^a-zA-Z0-9-]/g, "");
  return path.join(DELIVERY_DIR, safe);
}

function sign(fileId: string, exp: number): string {
  return crypto.createHmac("sha256", SIGNING_SECRET).update(`${fileId}.${exp}`).digest("hex");
}

export async function sweepExpiredFiles(): Promise<{ deleted: number }> {
  let deleted = 0;
  try {
    const entries = await fs.readdir(DELIVERY_DIR, { withFileTypes: true });
    const cutoff = Date.now() - TTL_SECONDS * 1000;
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const fullPath = path.join(DELIVERY_DIR, entry.name);
      const stat = await fs.stat(fullPath);
      if (stat.mtimeMs < cutoff) {
        await fs.unlink(fullPath).catch(() => {});
        deleted++;
      }
    }
  } catch {
    // directory may not exist yet
  }
  if (deleted > 0) logger.info("swept expired temp files", { deleted });
  return { deleted };
}
