export type MarkdownDocumentInput = { fileName: string; content: string };

export type MarkdownDocumentPreview = {
  documentId: string;
  title: string;
  intro: string;
  parentCount: number;
  childCount: number;
  estimatedEmbeddingTokens: number;
  estimatedEmbeddingCost: number;
};

export type RagParentChunk = {
  id: string;
  headingPath: string[];
  content: string;
};

export type RagChildChunk = {
  id: string;
  parentId: string;
  content: string;
};

export type PreparedMarkdownDocument = MarkdownDocumentPreview & {
  parents: RagParentChunk[];
  children: RagChildChunk[];
};

export type MarkdownBatchPreview = { documents: MarkdownDocumentPreview[] };

const CHILD_TOKEN_TARGET = 350;
const CHILD_TOKEN_OVERLAP = 60;

function readFrontMatter(content: string): Record<string, string> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return {};

  const values: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && value) values[key] = value;
  }
  return values;
}

function withoutFrontMatter(content: string): string {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "");
}

function firstHeading(content: string): string {
  return content.match(/^#\s+(.+)$/m)?.[1].trim() || "";
}

function firstParagraph(content: string): string {
  return (
    withoutFrontMatter(content)
      .split(/\r?\n\s*\r?\n/)
      .map((section) => section.trim())
      .find((section) => section && !section.startsWith("#") && !section.startsWith("```")) || ""
  );
}

function parentSections(content: string): { headingPath: string[]; content: string }[] {
  const body = withoutFrontMatter(content);
  const documentHeading = firstHeading(body);
  const headings = [...body.matchAll(/^##\s+.+$/gm)];
  if (!headings.length) {
    return [{ headingPath: documentHeading ? [documentHeading] : [], content: body.trim() }];
  }

  return headings.map((heading, index) => ({
    headingPath: [documentHeading, heading[0].replace(/^##\s+/, "").trim()].filter(Boolean),
    content: body.slice(heading.index, headings[index + 1]?.index).trim(),
  }));
}

/** 预检用保守估算：中文字符按 1 Token，其余连续单词按 1 Token。 */
function estimateTokens(text: string): number {
  const cjk = text.match(/[\u3400-\u9fff]/g)?.length || 0;
  const words = text
    .replace(/[\u3400-\u9fff]/g, " ")
    .match(/[A-Za-z0-9_./:+-]+/g)?.length || 0;
  return cjk + words;
}

function overlapTail(content: string): string {
  const characters = Math.max(CHILD_TOKEN_OVERLAP, Math.floor(CHILD_TOKEN_OVERLAP * 1.5));
  return content.slice(-characters).trim();
}

function markdownBlocks(content: string): string[] {
  const blocks: string[] = [];
  let lines: string[] = [];
  let inCodeFence = false;

  function flush() {
    const block = lines.join("\n").trim();
    if (block) blocks.push(block);
    lines = [];
  }

  for (const line of content.split(/\r?\n/)) {
    if (/^```/.test(line.trim())) {
      if (!inCodeFence) {
        flush();
        lines.push(line);
        inCodeFence = true;
      } else {
        lines.push(line);
        flush();
        inCodeFence = false;
      }
      continue;
    }
    if (inCodeFence) {
      lines.push(line);
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    lines.push(line);
  }
  flush();
  return blocks;
}

function splitParentIntoChildren(parent: string): string[] {
  const paragraphs = markdownBlocks(parent);

  const children: string[] = [];
  let current: string[] = [];
  let currentTokens = 0;
  for (const paragraph of paragraphs) {
    const tokens = estimateTokens(paragraph);
    if (currentTokens && currentTokens + tokens > CHILD_TOKEN_TARGET) {
      const completed = current.join("\n\n");
      children.push(completed);
      const overlap = overlapTail(completed);
      current = overlap ? [overlap, paragraph] : [paragraph];
      currentTokens = estimateTokens(overlap) + tokens;
    } else {
      current.push(paragraph);
      currentTokens += tokens;
    }
  }
  if (current.length) children.push(current.join("\n\n"));
  return children.length ? children : [parent];
}

export function prepareMarkdownDocument(input: MarkdownDocumentInput): PreparedMarkdownDocument {
  const frontMatter = readFrontMatter(input.content);
  const sections = parentSections(input.content);
  const parents = sections.map((section, index) => ({
    id: `${input.fileName}::parent-${index + 1}`,
    headingPath: section.headingPath,
    content: section.content,
  }));
  const children = parents.flatMap((parent) =>
    splitParentIntoChildren(parent.content).map((content, index) => ({
      id: `${parent.id}::child-${index + 1}`,
      parentId: parent.id,
      content: `标题路径: ${parent.headingPath.join(" > ")}\n\n${content}`.trim(),
    }))
  );
  const estimatedEmbeddingTokens = children.reduce(
    (total, child) => total + estimateTokens(child.content),
    0
  );

  return {
    documentId: input.fileName,
    title: frontMatter.title || firstHeading(input.content) || input.fileName,
    intro: frontMatter.description || firstParagraph(input.content),
    parentCount: parents.length,
    childCount: children.length,
    estimatedEmbeddingTokens,
    estimatedEmbeddingCost: estimateModelCost(
      process.env.QWEN_EMBED_MODEL || "text-embedding-v3",
      estimatedEmbeddingTokens
    ),
    parents,
    children,
  };
}

export function previewMarkdownDocument(
  input: MarkdownDocumentInput
): MarkdownDocumentPreview {
  const { parents: _parents, children: _children, ...preview } = prepareMarkdownDocument(input);
  return preview;
}

export function previewMarkdownBatch(inputs: MarkdownDocumentInput[]): MarkdownBatchPreview {
  const identifiers = new Set<string>();
  for (const input of inputs) {
    if (!input.fileName.toLowerCase().endsWith(".md")) {
      throw new Error(`只支持 .md 文件: ${input.fileName}`);
    }
    if (identifiers.has(input.fileName)) throw new Error(`重复文件名: ${input.fileName}`);
    identifiers.add(input.fileName);
  }
  return { documents: inputs.map(previewMarkdownDocument) };
}
import { estimateModelCost } from "@/config/rag-pricing";
