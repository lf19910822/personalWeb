// 通义千问 DashScope(OpenAI 兼容模式)封装
const BASE = "https://dashscope.aliyuncs.com/compatible-mode/v1";

export function hasLlm(): boolean {
  return !!process.env.QWEN_API_KEY;
}

export type ModelUsage = { inputTokens: number; outputTokens: number };
export type ChatStreamEvent =
  | { type: "delta"; text: string }
  | { type: "usage"; usage: ModelUsage };
function usageOf(data: any): ModelUsage {
  return {
    inputTokens: Number(data?.usage?.prompt_tokens || data?.usage?.input_tokens || data?.usage?.total_tokens || 0),
    outputTokens: Number(data?.usage?.completion_tokens || data?.usage?.output_tokens || 0),
  };
}

/** 文本向量化 */
export async function embedWithUsage(text: string): Promise<{ vector: number[]; usage: ModelUsage }> {
  const key = process.env.QWEN_API_KEY;
  if (!key) throw new Error("QWEN_API_KEY 未配置");
  const model = process.env.QWEN_EMBED_MODEL || "text-embedding-v3";
  const res = await fetch(`${BASE}/embeddings`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, input: text }),
  });
  if (!res.ok) throw new Error(`embed 失败: ${res.status}`);
  const data = await res.json();
  return { vector: data.data[0].embedding as number[], usage: usageOf(data) };
}

export async function embed(text: string): Promise<number[]> {
  return (await embedWithUsage(text)).vector;
}

/** 对话补全 */
export async function chatWithUsage(
  messages: { role: string; content: string }[]
): Promise<{ text: string; usage: ModelUsage }> {
  const key = process.env.QWEN_API_KEY;
  if (!key) throw new Error("QWEN_API_KEY 未配置");
  const model = process.env.QWEN_CHAT_MODEL || "qwen-plus";
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, temperature: 0.2 }),
  });
  if (!res.ok) throw new Error(`chat 失败: ${res.status}`);
  const data = await res.json();
  return { text: data.choices[0].message.content as string, usage: usageOf(data) };
}

/** 以 OpenAI 兼容 SSE 协议逐段读取通义千问回答，并在末尾取得实际 Token 用量。 */
export async function* chatStreamWithUsage(
  messages: { role: string; content: string }[]
): AsyncGenerator<ChatStreamEvent> {
  const key = process.env.QWEN_API_KEY;
  if (!key) throw new Error("QWEN_API_KEY 未配置");
  const model = process.env.QWEN_CHAT_MODEL || "qwen-plus";
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      stream: true,
      stream_options: { include_usage: true },
    }),
  });
  if (!res.ok) throw new Error(`chat 流式请求失败: ${res.status}`);
  if (!res.body) throw new Error("chat 流式响应缺少数据流");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  async function* readEvents(chunk: string): AsyncGenerator<ChatStreamEvent> {
    buffer += chunk.replace(/\r\n/g, "\n");
    while (true) {
      const boundary = buffer.indexOf("\n\n");
      if (boundary < 0) return;
      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const data = rawEvent
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (!data || data === "[DONE]") continue;

      let payload: any;
      try {
        payload = JSON.parse(data);
      } catch {
        continue;
      }
      const text = payload?.choices?.[0]?.delta?.content;
      if (typeof text === "string" && text) yield { type: "delta", text };
      if (payload?.usage) yield { type: "usage", usage: usageOf(payload) };
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (value) {
        for await (const event of readEvents(decoder.decode(value, { stream: true }))) yield event;
      }
      if (done) break;
    }
    for await (const event of readEvents(decoder.decode())) yield event;
  } finally {
    reader.releaseLock();
  }
}

export async function chat(messages: { role: string; content: string }[]): Promise<string> {
  return (await chatWithUsage(messages)).text;
}
