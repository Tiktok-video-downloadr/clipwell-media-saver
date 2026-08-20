import { NextRequest, NextResponse } from "next/server";
import { sweepExpiredFiles } from "@/lib/storage/tempStorage";
import { logger } from "@/lib/observability/logger";

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-cron-token");
  if (process.env.CRON_TOKEN && token !== process.env.CRON_TOKEN) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const result = await sweepExpiredFiles();
  logger.info("sweep cron ran", result);
  return NextResponse.json(result);
}
