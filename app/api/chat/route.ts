import { NextRequest, NextResponse } from "next/server";
import { retrieve, answer } from "@/lib/rag";
export const dynamic = "force-dynamic";

export const runtime = "nodejs";

type HistoryMessage = { role: "user" | "assistant"; content: string };

function sanitizeHistory(value: unknown): HistoryMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is HistoryMessage =>
        !!item &&
        typeof item === "object" &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string"
    )
    .slice(-4);
}

export async function POST(req: NextRequest) {
  try {
    const { question, history } = await req.json();
    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "缺少问题内容" }, { status: 400 });
    }
    const retrieved = await retrieve(question, 6);
    const { text, sources } = await answer(question, sanitizeHistory(history), retrieved);
    return NextResponse.json({ answer: text, sources });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "内部错误" }, { status: 500 });
  }
}
