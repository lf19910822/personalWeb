import fs from "fs/promises";
import path from "path";
import { buildRagSystemPrompt } from "@/prompts/rag-system";
import { prepareMarkdownDocument, RagChildChunk, RagParentChunk } from "./rag-documents";
import { chatWithUsage, embedWithUsage, hasLlm } from "./llm";
import { recordRagUsage } from "./rag-usage";
import { readJson, writeJson } from "./storage";

/**
 * 语料库(内存缓存 + 持久化索引)。
 * - `rag/index.json` 保存文档分块与 embedding；配置 COS 时落到 COS，否则落到本地 data/objects/。
 * - 没有持久化索引时，从 data/corpus.json 种子初始化，并在首次加载后尝试写入索引。
 */

type Doc = {
  id: string;
  title: string;
  intro: string;
  chunks: string[];
  parents?: RagParentChunk[];
  children?: RagChildChunk[];
  updatedAt?: string;
};
type Chunk = { docId: string; title: string; text: string; parentId?: string; parentText?: string };
type Embedding = { docId: string; text: string; vector: number[] };
type PersistedRagIndex = {
  version: 1;
  embeddingModel: string | null;
  docs: Doc[];
  embeddings: Embedding[];
  updatedAt: string;
};

export type DocMeta = { id: string; title: string; intro: string };
export type Retrieved = { text: string; source: string };
export type HistoryMessage = { role: "user" | "assistant"; content: string };

export const RAG_INDEX_KEY = "rag/index.json";
const SEED_CORPUS_PATH = path.join(process.cwd(), "data", "corpus.json");

let docs: Doc[] = [];
let vectors: Record<string, number[]> = {};
let vectorModel: string | null = null;
let loaded = false;

function vectorKey(docId: string, text: string): string {
  return `${docId}::${text}`;
}

function configuredEmbeddingModel(): string {
  return process.env.QWEN_EMBED_MODEL || "text-embedding-v3";
}

function isDoc(value: unknown): value is Doc {
  if (!value || typeof value !== "object") return false;
  const doc = value as Doc;
  return (
    typeof doc.id === "string" &&
    typeof doc.title === "string" &&
    typeof doc.intro === "string" &&
    Array.isArray(doc.chunks) &&
    doc.chunks.every((chunk) => typeof chunk === "string")
  );
}

function isPersistedIndex(value: unknown): value is PersistedRagIndex {
  if (!value || typeof value !== "object") return false;
  const index = value as PersistedRagIndex;
  return (
    index.version === 1 &&
    (typeof index.embeddingModel === "string" || index.embeddingModel === null) &&
    Array.isArray(index.docs) &&
    index.docs.every(isDoc) &&
    Array.isArray(index.embeddings) &&
    index.embeddings.every(
      (entry) =>
        !!entry &&
        typeof entry.docId === "string" &&
        typeof entry.text === "string" &&
        Array.isArray(entry.vector) &&
        entry.vector.every((dimension) => typeof dimension === "number")
    )
  );
}

function allChunks(): Chunk[] {
  const out: Chunk[] = [];
  for (const doc of docs) {
    if (doc.children?.length && doc.parents?.length) {
      const parents = new Map(doc.parents.map((parent) => [parent.id, parent]));
      for (const child of doc.children) {
        const parent = parents.get(child.parentId);
        if (parent) {
          out.push({
            docId: doc.id,
            title: doc.title,
            text: child.content,
            parentId: parent.id,
            parentText: parent.content,
          });
        }
      }
      continue;
    }
    for (const text of doc.chunks) out.push({ docId: doc.id, title: doc.title, text });
  }
  return out;
}

function makeIndex(): PersistedRagIndex {
  const embeddings: Embedding[] = [];
  for (const chunk of allChunks()) {
    const vector = vectors[vectorKey(chunk.docId, chunk.text)];
    if (vector) embeddings.push({ docId: chunk.docId, text: chunk.text, vector });
  }
  return {
    version: 1,
    embeddingModel: vectorModel,
    docs,
    embeddings,
    updatedAt: new Date().toISOString(),
  };
}

async function persistIndex(): Promise<void> {
  await writeJson(RAG_INDEX_KEY, makeIndex());
}

async function loadSeedCorpus(): Promise<void> {
  const raw = await fs.readFile(SEED_CORPUS_PATH, "utf8");
  const seed = JSON.parse(raw);
  docs = Array.isArray(seed.docs) ? seed.docs.filter(isDoc) : [];

  // 兼容旧的本地向量缓存；下次成功写入时会迁移到 rag/index.json。
  try {
    const legacy = JSON.parse(
      await fs.readFile(path.join(process.cwd(), "data", "vectors.json"), "utf8")
    );
    for (const entry of legacy.embeddings || []) {
      if (
        typeof entry?.docId === "string" &&
        typeof entry?.text === "string" &&
        Array.isArray(entry?.vector)
      ) {
        vectors[vectorKey(entry.docId, entry.text)] = entry.vector;
      }
    }
  } catch {
    // 无旧向量缓存时，首次真实检索会生成并持久化向量。
  }
}

export async function ensureLoaded() {
  if (loaded) return;

  const persisted = await readJson<unknown>(RAG_INDEX_KEY, null);
  if (isPersistedIndex(persisted)) {
    docs = persisted.docs;
    vectorModel = persisted.embeddingModel;
    vectors = Object.fromEntries(
      persisted.embeddings.map((entry) => [vectorKey(entry.docId, entry.text), entry.vector])
    );
    loaded = true;
    return;
  }

  await loadSeedCorpus();
  loaded = true;

  // 本地开发与已配置 COS 的首次启动都会建立可复用索引；无写权限时仍可用种子语料。
  try {
    await persistIndex();
  } catch (error) {
    console.warn("[rag] 初始化持久化索引失败，将仅使用内存缓存", error);
  }
}

/** 生成当前 embedding 模型缺少的向量；模型变更时会整库重新向量化。 */
async function generateMissingEmbeddings(chunks: Chunk[]): Promise<boolean> {
  if (!hasLlm()) return false;

  const model = configuredEmbeddingModel();
  const nextVectors = vectorModel === model ? { ...vectors } : {};
  let changed = vectorModel !== model;
  for (const chunk of chunks) {
    const key = vectorKey(chunk.docId, chunk.text);
    if (!nextVectors[key]) {
      const result = await embedWithUsage(chunk.text);
      nextVectors[key] = result.vector;
      await recordRagUsage({
        kind: "embedding",
        model,
        inputTokens: result.usage.inputTokens,
      });
      changed = true;
    }
  }

  if (changed) {
    vectors = nextVectors;
    vectorModel = model;
  }
  return changed;
}

/** 后台上传:切分 + 向量化 + 持久化。 */
export async function addDoc(input: {
  title: string;
  intro: string;
  content: string;
}): Promise<{ id: string; title: string; intro: string; chunks: string[] }> {
  await ensureLoaded();
  const id = "doc-" + Date.now().toString(36);
  const chunks = String(input.content)
    .split(/\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean);
  docs.push({ id, title: input.title, intro: input.intro || "", chunks });

  if (hasLlm()) {
    try {
      await generateMissingEmbeddings(allChunks());
    } catch (error) {
      // 文档仍会持久化；后续检索会再次尝试为缺少的向量补齐 embedding。
      console.error("[rag] embedding 失败，将在后续检索时重试", error);
    }
  }
  await persistIndex();

  return { id, title: input.title, intro: input.intro, chunks };
}

export async function upsertMarkdownDocument(input: { fileName: string; content: string }) {
  await ensureLoaded();
  const prepared = prepareMarkdownDocument(input);
  const next: Doc = {
    id: prepared.documentId,
    title: prepared.title,
    intro: prepared.intro,
    chunks: prepared.children.map((child) => child.content),
    parents: prepared.parents,
    children: prepared.children,
    updatedAt: new Date().toISOString(),
  };
  const previous = docs;
  docs = [...docs.filter((doc) => doc.id !== next.id), next];
  try {
    if (hasLlm()) await generateMissingEmbeddings(allChunks());
    await persistIndex();
    return prepared;
  } catch (error) {
    docs = previous;
    throw error;
  }
}

export async function removeDocument(documentId: string): Promise<boolean> {
  await ensureLoaded();
  const next = docs.filter((doc) => doc.id !== documentId);
  if (next.length === docs.length) return false;
  docs = next;
  await persistIndex();
  return true;
}

export async function listDocuments() {
  await ensureLoaded();
  return docs.map((doc) => ({
    id: doc.id,
    fileName: doc.id,
    title: doc.title,
    intro: doc.intro,
    parentCount: doc.parents?.length || doc.chunks.length,
    childCount: doc.children?.length || doc.chunks.length,
    updatedAt: doc.updatedAt || "",
  }));
}

export async function getCorpusMeta(): Promise<DocMeta[]> {
  await ensureLoaded();
  return docs.map((doc) => ({ id: doc.id, title: doc.title, intro: doc.intro }));
}

export async function getChunks(): Promise<Chunk[]> {
  await ensureLoaded();
  return allChunks();
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
    .filter((term) => term.length > 0);
  let score = 0;
  const lower = text.toLowerCase();
  for (const term of terms) if (lower.includes(term)) score += 1;
  return score;
}

/** 检索 topK 相关分块(有 Key 走向量余弦,否则走关键词) */
export async function retrieve(query: string, topK = 6): Promise<Retrieved[]> {
  await ensureLoaded();
  const chunks = await getChunks();
  let scored: { chunk: Chunk; score: number }[] = [];

  if (hasLlm()) {
    try {
      if (await generateMissingEmbeddings(chunks)) await persistIndex();
      const queryEmbedding = await embedWithUsage(query);
      await recordRagUsage({
        kind: "embedding",
        model: configuredEmbeddingModel(),
        inputTokens: queryEmbedding.usage.inputTokens,
      });
      const vector = queryEmbedding.vector;
      scored = chunks.map((chunk) => {
        const storedVector = vectors[vectorKey(chunk.docId, chunk.text)];
        const score = storedVector ? cosine(vector, storedVector) : keywordScore(query, chunk.text);
        return { chunk, score };
      });
    } catch {
      scored = chunks.map((chunk) => ({ chunk, score: keywordScore(query, chunk.text) }));
    }
  } else {
    scored = chunks.map((chunk) => ({ chunk, score: keywordScore(query, chunk.text) }));
  }

  scored.sort((a, b) => b.score - a.score);
  const matched = scored.filter((entry) => entry.score > 0).slice(0, topK);
  const use = matched.length ? matched : scored.slice(0, topK);
  const parents = new Map<string, Retrieved>();
  for (const entry of use) {
    const key = entry.chunk.parentId || `${entry.chunk.docId}::${entry.chunk.text}`;
    if (!parents.has(key)) {
      parents.set(key, { text: entry.chunk.parentText || entry.chunk.text, source: entry.chunk.title });
    }
  }
  return [...parents.values()].slice(0, 2);
}

/** 生成回答(严格基于文档;无 Key 走降级模板) */
export async function answer(
  question: string,
  history: HistoryMessage[],
  retrieved: Retrieved[]
): Promise<{ text: string; sources: string[] }> {
  const sources = [...new Set(retrieved.map((item) => item.source))];
  const context = retrieved
    .map((item, index) => `[${index + 1}] (来源: ${item.source})\n${item.text}`)
    .join("\n\n");

  if (!hasLlm()) {
    const snippet = retrieved.map((item) => item.text).join(" ");
    const text = `（演示模式:尚未配置大模型 API Key,以下为基于资料的原文摘录）\n\n${snippet.slice(
      0,
      320
    )}…\n\n引用来源:${sources.join(
      "、"
    )}。配置 QWEN_API_KEY 后,AI 会基于文档精准作答并拒答资料外的问题。`;
    return { text, sources };
  }

  const messages = [
    { role: "system", content: buildRagSystemPrompt(context) },
    ...history.slice(-4),
    { role: "user", content: question },
  ];
  const result = await chatWithUsage(messages);
  await recordRagUsage({
    kind: "chat",
    model: process.env.QWEN_CHAT_MODEL || "qwen-plus",
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
  });
  return { text: result.text, sources };
}
