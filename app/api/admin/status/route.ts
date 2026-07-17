import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { getCorpusMeta } from "@/lib/rag";
import { listMessages } from "@/lib/store";
import { listVisitors } from "@/lib/visitors";
import { storageBackend } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!verifyToken(cookies().get("admin_token")?.value)) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const [docs, messages, visitors] = await Promise.all([
    getCorpusMeta(),
    listMessages(),
    listVisitors(),
  ]);
  return NextResponse.json({
    llm: !!process.env.QWEN_API_KEY,
    mail: !!process.env.RESEND_API_KEY,
    storage: storageBackend(),
    docCount: docs.length,
    messageCount: messages.length,
    visitorCount: visitors.length,
  });
}
