// 通义千问 DashScope(OpenAI 兼容模式)封装
const BASE = "https://dashscope.aliyuncs.com/compatible-mode/v1";

export function hasLlm(): boolean {
  return !!process.env.QWEN_API_KEY;
}

/** 文本向量化 */
export async function embed(text: string): Promise<number[]> {
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
  return data.data[0].embedding as number[];
}

/** 对话补全 */
export async function chat(messages: { role: string; content: string }[]): Promise<string> {
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
  return data.choices[0].message.content as string;
}
