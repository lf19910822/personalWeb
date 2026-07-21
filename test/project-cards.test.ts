import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({
  value: [] as unknown[],
  readJson: vi.fn(),
  writeJson: vi.fn(),
}));

vi.mock("../lib/storage", () => ({
  readJson: storage.readJson,
  writeJson: storage.writeJson,
}));

import {
  createProjectCard,
  listProjectCards,
  listPublishedProjectCards,
  updateProjectCard,
} from "../lib/project-cards";

const input = {
  title: "Cost Hub 多源成本数据平台",
  summary: "面向经营与项目成本分析的 Go 服务。",
  background: "外部成本数据分散，项目归集口径不统一。",
  role: "负责后端架构与成本归集设计。",
  solutions: ["后台同步外部系统数据", "本地 PostgreSQL 查询缓存"],
  results: ["隔离第三方系统的限流与会话风险"],
  tags: ["Go", "Kratos", "PostgreSQL"],
  sortOrder: 10,
  relatedDocumentId: "cost-hub-多源成本数据平台技术复盘.md",
};

describe("公开项目卡片", () => {
  beforeEach(() => {
    storage.value = [];
    storage.readJson.mockImplementation(async (_key: string, fallback: unknown) => storage.value || fallback);
    storage.writeJson.mockImplementation(async (_key: string, value: unknown) => { storage.value = value as unknown[]; });
  });

  it("新建项目默认为草稿，发布后才进入访问页列表", async () => {
    const draft = await createProjectCard(input);

    expect(draft.status).toBe("draft");
    expect(await listPublishedProjectCards()).toEqual([]);

    const published = await updateProjectCard(draft.id, { status: "published" });
    expect(published?.status).toBe("published");
    expect(await listPublishedProjectCards()).toMatchObject([{ id: draft.id, title: input.title }]);
  });

  it("访问页只读取已发布卡片，并按排序号排列", async () => {
    const later = await createProjectCard({ ...input, title: "后置项目", sortOrder: 20 });
    const first = await createProjectCard({ ...input, title: "前置项目", sortOrder: 1 });
    await updateProjectCard(later.id, { status: "published" });
    await updateProjectCard(first.id, { status: "published" });

    expect((await listProjectCards()).map((project) => project.title)).toEqual(["前置项目", "后置项目"]);
    expect((await listPublishedProjectCards()).map((project) => project.title)).toEqual(["前置项目", "后置项目"]);
  });
});
