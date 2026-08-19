import { NextRequest, NextResponse } from "next/server";
import { getJobStatus } from "@/lib/queue/queue";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const status = await getJobStatus(params.id);
  if (!status) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json(status);
}
