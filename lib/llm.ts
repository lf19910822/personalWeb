// 通义千问 DashScope(OpenAI 兼容模式)封装
const BASE = "https://dashscope.aliyuncs.com/compatible-mode/v1";

export function hasLlm(): boolean {
  return !!process.env.QWEN_API_KEY;
}

export type ModelUsage = { inputTokens: number; outputTokens: number };
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

export async function chat(messages: { role: string; content: string }[]): Promise<string> {
  return (await chatWithUsage(messages)).text;
}
