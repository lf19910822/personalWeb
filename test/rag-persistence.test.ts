import { beforeAll, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({
  readJson: vi.fn(),
  writeJson: vi.fn(),
}));
const fileSystem = vi.hoisted(() => ({ readFile: vi.fn() }));

vi.mock("../lib/storage", () => storage);
vi.mock("fs/promises", () => ({ default: fileSystem }));

import { getCorpusMeta, RAG_INDEX_KEY } from "../lib/rag";

describe("RAG 持久化索引", () => {
  beforeAll(() => {
    storage.readJson.mockResolvedValue(null);
    fileSystem.readFile.mockImplementation(async (file: string) => {
      if (file.endsWith("corpus.json")) {
        return JSON.stringify({
          docs: [{ id: "seed", title: "种子资料", intro: "测试", chunks: ["第一段"] }],
        });
      }
      throw new Error("没有旧向量缓存");
    });
  });

  it("首次加载时将种子语料写入持久化索引", async () => {
    await expect(getCorpusMeta()).resolves.toEqual([
      { id: "seed", title: "种子资料", intro: "测试" },
    ]);

    expect(storage.readJson).toHaveBeenCalledWith(RAG_INDEX_KEY, null);
    expect(storage.writeJson).toHaveBeenCalledWith(
      RAG_INDEX_KEY,
      expect.objectContaining({
        version: 1,
        embeddingModel: null,
        docs: [expect.objectContaining({ id: "seed" })],
        embeddings: [],
      })
    );
  });
});
