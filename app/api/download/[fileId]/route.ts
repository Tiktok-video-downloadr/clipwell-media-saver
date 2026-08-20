import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { verifySignedDownload, resolveDeliveryPath } from "@/lib/storage/tempStorage";
import { trackFunnelEvent } from "@/lib/observability/metrics";
import { logger } from "@/lib/observability/logger";

export async function GET(req: NextRequest, { params }: { params: { fileId: string } }) {
  const url = new URL(req.url);
  const exp = url.searchParams.get("exp");
  const sig = url.searchParams.get("sig");

  if (!exp || !sig || !verifySignedDownload(params.fileId, exp, sig)) {
    return NextResponse.json({ error: "LINK_EXPIRED_OR_INVALID" }, { status: 403 });
  }

  const filePath = resolveDeliveryPath(params.fileId);

  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  trackFunnelEvent("download_started", { fileId: params.fileId });
  logger.info("download served", { fileId: params.fileId, sizeBytes: stat.size });

  const stream = createReadStream(filePath);
  const webStream = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(chunk));
      stream.on("end", () => {
        controller.close();
        trackFunnelEvent("download_completed", { fileId: params.fileId });
      });
      stream.on("error", (err) => controller.error(err));
    },
    cancel() {
      stream.destroy();
    },
  });

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(stat.size),
      "Content-Disposition": `attachment; filename="download${filePath.slice(filePath.lastIndexOf("."))}"`,
      "Cache-Control": "no-store",
    },
  });
}
