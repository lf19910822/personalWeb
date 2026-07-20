import { describe, expect, it } from "vitest";
import { buildRagSystemPrompt } from "../prompts/rag-system";

describe("RAG 系统提示词", () => {
  it("将检索语料替换进独立提示词模板", () => {
    const prompt = buildRagSystemPrompt("[1] (来源: 测试资料)\n语料内容");

    expect(prompt).toContain("语料内容");
    expect(prompt).not.toContain("{{context}}");
  });
});
