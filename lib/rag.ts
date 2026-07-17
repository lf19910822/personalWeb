import fs from "fs/promises";
import path from "path";
import { embed, chat, hasLlm } from "./llm";

/**
 * 语料库(内存态单例)。
 * - 进程启动时从 data/corpus.json 种子加载一次。
 * - 后台上传的文档只进内存(按需求:不落库、重启回退到种子),满足"AI 架构简单"的要求。
 */

type Doc = { id: string; title: string; intro: string; chunks: string[] };
export type DocMeta = { id: string; title: string; intro: string };
type Chunk = { docId: string; title: string; text: string };
export type Retrieved = { text: string; source: string };

let docs: Doc[] = [];
let vectors: Record<string, number[]> = {};
let loaded = false;

export async function ensureLoaded() {
  if (loaded) return;
  const corpusPath = path.join(process.cwd(), "data", "corpus.json");
  const raw = await fs.readFile(corpusPath, "utf8");
  const json = JSON.parse(raw);
  docs = json.docs || [];
  try {
    const v = JSON.parse(
      await fs.readFile(path.join(process.cwd(), "data", "vectors.json"), "utf8")
    );
    for (const e of v.embeddings || []) vectors[`${e.docId}::${e.text}`] = e.vector;
  } catch {
    // 无向量缓存则走关键词降级
  }
  loaded = true;
}

/** 后台上传:切分 + (配 Key 时)向量化 + 进内存 */
export async function addDoc(input: {
  title: string;
  intro: string;
  content: string;
}): Promise<{ id: string; title: string; intro: string; chunks: string[] }> {
  await ensureLoaded();
  const id = "doc-" + Date.now().toString(36);
  const chunks = String(input.content)
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  docs.push({ id, title: input.title, intro: input.intro || "", chunks });
  if (hasLlm()) {
    try {
      for (const c of chunks) vectors[`${id}::${c}`] = await embed(c);
    } catch (e) {
      console.error("[rag] embedding 失败", e);
    }
  }
  return { id, title: input.title, intro: input.intro, chunks };
}

export async function getCorpusMeta(): Promise<DocMeta[]> {
  await ensureLoaded();
  return docs.map((d) => ({ id: d.id, title: d.title, intro: d.intro }));
}

export async function getChunks(): Promise<Chunk[]> {
  await ensureLoaded();
  const out: Chunk[] = [];
  for (const d of docs) for (const c of d.chunks) out.push({ docId: d.id, title: d.title, text: c });
  return out;
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

/** 检索 topK 相关分块(有 Key 走向量余弦,否则走关键词) */
export async function retrieve(query: string, topK = 3): Promise<Retrieved[]> {
  await ensureLoaded();
  const chunks = await getChunks();
  let scored: { chunk: Chunk; score: number }[] = [];

  if (hasLlm()) {
    try {
      const vec = await embed(query);
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
    const text = `（演示模式:尚未配置大模型 API Key,以下为基于资料的原文摘录）\n\n${snippet.slice(
      0,
      320
    )}…\n\n引用来源:${sources.join(
      "、"
    )}。配置 QWEN_API_KEY 后,AI 会基于文档精准作答并拒答资料外的问题。`;
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
