import fs from "fs/promises";
import path from "path";
import { embed, chat, hasLlm } from "./llm";

const DATA = path.join(process.cwd(), "data");
const CORPUS = path.join(DATA, "corpus.json");
const VECTORS = path.join(DATA, "vectors.json");

export type DocMeta = { id: string; title: string; intro: string };
export type Chunk = { docId: string; title: string; text: string };
export type Retrieved = { text: string; source: string };

/** 语料元数据(标题 + 简介),供前端下拉展示 */
export async function getCorpusMeta(): Promise<DocMeta[]> {
  const raw = await fs.readFile(CORPUS, "utf8");
  const json = JSON.parse(raw);
  return (json.docs || []).map((d: any) => ({ id: d.id, title: d.title, intro: d.intro }));
}

/** 展开所有分块 */
export async function getChunks(): Promise<Chunk[]> {
  const raw = await fs.readFile(CORPUS, "utf8");
  const json = JSON.parse(raw);
  const chunks: Chunk[] = [];
  for (const d of json.docs || []) {
    for (const c of d.chunks || []) chunks.push({ docId: d.id, title: d.title, text: c });
  }
  return chunks;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

function keywordScore(q: string, text: string): number {
  const terms = q
    .toLowerCase()
    .split(/[\s,，。、？?！!；;：:]+/)
    .filter((t) => t.length > 0);
  let s = 0;
  const lower = text.toLowerCase();
  for (const t of terms) if (lower.includes(t)) s += 1;
  return s;
}

async function loadVectors(): Promise<Record<string, number[]>> {
  try {
    const raw = await fs.readFile(VECTORS, "utf8");
    const json = JSON.parse(raw);
    const map: Record<string, number[]> = {};
    for (const e of json.embeddings || []) map[`${e.docId}::${e.text}`] = e.vector;
    return map;
  } catch {
    return {};
  }
}

/** 检索 topK 相关分块(有 Key 走向量余弦,否则走关键词) */
export async function retrieve(query: string, topK = 3): Promise<Retrieved[]> {
  const chunks = await getChunks();
  let scored: { chunk: Chunk; score: number }[] = [];

  if (hasLlm()) {
    try {
      const vec = await embed(query);
      const vectors = await loadVectors();
      scored = chunks.map((chunk) => {
        const v = vectors[`${chunk.docId}::${chunk.text}`];
        const score = v ? cosine(vec, v) : keywordScore(query, chunk.text);
        return { chunk, score };
      });
    } catch {
      scored = chunks.map((chunk) => ({ chunk, score: keywordScore(query, chunk.text) }));
    }
  } else {
    scored = chunks.map((chunk) => ({ chunk, score: keywordScore(query, chunk.text) }));
  }

  scored.sort((a, b) => b.score - a.score);
  const matched = scored.filter((s) => s.score > 0).slice(0, topK);
  const use = matched.length ? matched : scored.slice(0, topK);
  return use.map((s) => ({ text: s.chunk.text, source: s.chunk.title }));
}

/** 生成回答(严格基于文档;无 Key 走降级模板) */
export async function answer(
  question: string,
  history: { role: string; content: string }[],
  retrieved: Retrieved[]
): Promise<{ text: string; sources: string[] }> {
  const sources = [...new Set(retrieved.map((r) => r.source))];
  const context = retrieved
    .map((r, i) => `[${i + 1}] (来源: ${r.source})\n${r.text}`)
    .join("\n\n");

  if (!hasLlm()) {
    const snippet = retrieved.map((r) => r.text).join(" ");
    const text = `（演示模式:尚未配置大模型 API Key,以下为基于资料的原文摘录）\n\n${snippet.slice(0, 320)}…\n\n引用来源:${sources.join("、")}。配置 QWEN_API_KEY 后,AI 会基于文档精准作答并拒答资料外的问题。`;
    return { text, sources };
  }

  const system = `你是"张明"的个人 AI 助手,只依据下面【资料】回答访客问题。
规则:
1. 严格基于资料,不得编造资料之外的内容。
2. 若资料中没有相关信息,明确说"这方面的资料里没有提到",不要猜测。
3. 回答末尾用"📎 引用:来源文档名"标注引用来源(可多个)。
4. 语气专业、简洁,像张明本人。

【资料】
${context}`;

  const messages = [
    { role: "system", content: system },
    ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: question },
  ];
  const text = await chat(messages);
  return { text, sources };
}
