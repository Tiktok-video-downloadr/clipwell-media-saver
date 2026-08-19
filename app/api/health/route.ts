import { NextResponse } from "next/server";
import { ingestionRegistry } from "@/lib/ingestion/registry";

export async function GET() {
  const adapters = await ingestionRegistry.healthSnapshot();
  const allHealthy = adapters.every((a) => a.healthy);
  return NextResponse.json(
    { status: allHealthy ? "healthy" : "degraded", adapters, checkedAt: new Date().toISOString() },
    { status: allHealthy ? 200 : 503 }
  );
}
