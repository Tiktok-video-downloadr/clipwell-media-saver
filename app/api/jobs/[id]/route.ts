import { NextRequest, NextResponse } from "next/server";
import { getJobStatus } from "@/lib/queue/queue";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const status = await getJobStatus(id);
  if (!status) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json(status);
}
