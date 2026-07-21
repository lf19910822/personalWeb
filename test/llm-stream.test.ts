import { afterEach, describe, expect, it, vi } from "vitest";
import { chatStreamWithUsage } from "../lib/llm";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.QWEN_API_KEY;
});

describe("Qwen 流式对话", () => {
  it("解析被任意拆分的 SSE 文本块和最终 Token 用量", async () => {
    process.env.QWEN_API_KEY = "test-key";
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"你'));
        controller.enqueue(encoder.encode('好"}}]}\n\ndata: {"choices":[{"delta":{"content":"，世界"}}],"usage":{"prompt_tokens":12,"completion_tokens":3}}\n\n'));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    let requestBody = "";
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestBody = String(init?.body || "");
      return new Response(body, { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const events = [];
    for await (const event of chatStreamWithUsage([{ role: "user", content: "你好" }])) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: "delta", text: "你好" },
      { type: "delta", text: "，世界" },
      { type: "usage", usage: { inputTokens: 12, outputTokens: 3 } },
    ]);
    expect(JSON.parse(requestBody)).toMatchObject({ stream: true });
  });
});
