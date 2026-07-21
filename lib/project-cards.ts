import { randomUUID } from "crypto";
import { readJson, writeJson } from "./storage";

const KEY = "site/projects.json";
const MAX_LIST_ITEMS = 3;
const MAX_TAGS = 8;

export type ProjectStatus = "draft" | "published";
export type ProjectCard = {
  id: string;
  title: string;
  summary: string;
  background: string;
  role: string;
  solutions: string[];
  results: string[];
  tags: string[];
  sortOrder: number;
  relatedDocumentId?: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

export type ProjectCardInput = Pick<
  ProjectCard,
  "title" | "summary" | "background" | "role" | "solutions" | "results" | "tags" | "sortOrder" | "relatedDocumentId"
>;

function text(value: unknown, name: string, maxLength: number): string {
  const output = String(value || "").trim();
  if (!output) throw new Error(`请填写${name}`);
  if (output.length > maxLength) throw new Error(`${name}不能超过 ${maxLength} 个字符`);
  return output;
}

function optionalText(value: unknown, maxLength: number): string | undefined {
  const output = String(value || "").trim();
  if (!output) return undefined;
  if (output.length > maxLength) throw new Error(`关联文档标识不能超过 ${maxLength} 个字符`);
  return output;
}

function textList(value: unknown, name: string, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) throw new Error(`${name}必须是列表`);
  const output = value.map((item) => String(item).trim()).filter(Boolean);
  if (!output.length) throw new Error(`请至少填写一条${name}`);
  if (output.length > maxItems) throw new Error(`${name}最多 ${maxItems} 条`);
  if (output.some((item) => item.length > maxLength)) throw new Error(`${name}单条不能超过 ${maxLength} 个字符`);
  return output;
}

function validate(input: ProjectCardInput): ProjectCardInput {
  const sortOrder = Number(input.sortOrder);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 9999) {
    throw new Error("排序号必须是 0 到 9999 的整数");
  }
  return {
    title: text(input.title, "项目名称", 100),
    summary: text(input.summary, "一句话简介", 220),
    background: text(input.background, "项目背景 / 问题", 800),
    role: text(input.role, "我的职责", 800),
    solutions: textList(input.solutions, "关键方案", MAX_LIST_ITEMS, 300),
    results: textList(input.results, "成果数据", MAX_LIST_ITEMS, 300),
    tags: textList(input.tags, "技术标签", MAX_TAGS, 40),
    sortOrder,
    relatedDocumentId: optionalText(input.relatedDocumentId, 200),
  };
}

function sortCards(cards: ProjectCard[]): ProjectCard[] {
  return [...cards].sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
}

async function readCards(): Promise<ProjectCard[]> {
  const cards = await readJson<ProjectCard[]>(KEY, []);
  return Array.isArray(cards) ? cards : [];
}

async function saveCards(cards: ProjectCard[]): Promise<void> {
  await writeJson(KEY, sortCards(cards));
}

export async function listProjectCards(): Promise<ProjectCard[]> {
  return sortCards(await readCards());
}

export async function listPublishedProjectCards(): Promise<ProjectCard[]> {
  return (await listProjectCards()).filter((card) => card.status === "published");
}

export async function createProjectCard(input: ProjectCardInput): Promise<ProjectCard> {
  const now = new Date().toISOString();
  const card: ProjectCard = {
    id: randomUUID(),
    ...validate(input),
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
  const cards = await readCards();
  cards.push(card);
  await saveCards(cards);
  return card;
}

export async function updateProjectCard(
  id: string,
  changes: Partial<ProjectCardInput> & { status?: ProjectStatus }
): Promise<ProjectCard | null> {
  const cards = await readCards();
  const index = cards.findIndex((card) => card.id === id);
  if (index < 0) return null;
  const existing = cards[index];
  const content = validate({
    title: changes.title ?? existing.title,
    summary: changes.summary ?? existing.summary,
    background: changes.background ?? existing.background,
    role: changes.role ?? existing.role,
    solutions: changes.solutions ?? existing.solutions,
    results: changes.results ?? existing.results,
    tags: changes.tags ?? existing.tags,
    sortOrder: changes.sortOrder ?? existing.sortOrder,
    relatedDocumentId: changes.relatedDocumentId ?? existing.relatedDocumentId,
  });
  const status = changes.status ?? existing.status;
  if (status !== "draft" && status !== "published") throw new Error("无效的发布状态");
  const now = new Date().toISOString();
  const next: ProjectCard = {
    ...existing,
    ...content,
    status,
    updatedAt: now,
    publishedAt: status === "published" ? existing.publishedAt || now : undefined,
  };
  cards[index] = next;
  await saveCards(cards);
  return next;
}

export async function deleteProjectCard(id: string): Promise<boolean> {
  const cards = await readCards();
  const next = cards.filter((card) => card.id !== id);
  if (next.length === cards.length) return false;
  await saveCards(next);
  return true;
}
