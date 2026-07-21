import { NextResponse } from "next/server";
import { getCorpusMeta } from "@/lib/rag";
import { currentChatModel } from "@/lib/model-status";
export const dynamic = "force-dynamic";

export const runtime = "nodejs";

export async function GET() {
  const docs = await getCorpusMeta();
  return NextResponse.json({ docs, model: currentChatModel() });
}
