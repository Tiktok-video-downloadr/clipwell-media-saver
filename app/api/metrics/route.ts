import { NextRequest, NextResponse } from "next/server";
import { metrics } from "@/lib/observability/metrics";

export async function GET(req: NextRequest) {
  const token = req.headers.get("x-metrics-token");
  if (process.env.METRICS_TOKEN && token !== process.env.METRICS_TOKEN) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  return new NextResponse(metrics.toPrometheusText(), {
    headers: { "Content-Type": "text/plain; version=0.0.4" },
  });
}
