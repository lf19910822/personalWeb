import { NextResponse } from "next/server";
import { getCorpusMeta } from "@/lib/rag";
export const dynamic = "force-dynamic";

export const runtime = "nodejs";

export async function GET() {
  const docs = await getCorpusMeta();
  return NextResponse.json({ docs });
}
