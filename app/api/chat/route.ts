import { NextRequest, NextResponse } from "next/server";
import { answerStream, retrieve } from "@/lib/rag";
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
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };
        try {
          for await (const event of answerStream(question, sanitizeHistory(history), retrieved)) {
            send(event.type, event.type === "sources" ? { sources: event.sources } : { text: event.text });
          }
          send("done", {});
        } catch (error: any) {
          send("error", { error: error?.message || "生成回答失败" });
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "内部错误" }, { status: 500 });
  }
}
