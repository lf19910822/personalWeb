import { describe, expect, it } from "vitest";
import { buildRagSystemPrompt } from "../prompts/rag-system";

describe("RAG 系统提示词", () => {
  it("将检索语料替换进独立提示词模板", () => {
    const prompt = buildRagSystemPrompt("[1] (来源: 测试资料)\n语料内容");

    expect(prompt).toContain("语料内容");
    expect(prompt).not.toContain("{{context}}");
  });

  it("不要求模型在正文中重复输出引用，由界面统一展示来源", () => {
    const prompt = buildRagSystemPrompt("[1] (来源: 测试资料)\n语料内容");

    expect(prompt).toContain("不要在正文末尾输出引用");
    expect(prompt).not.toContain('用"📎 引用:来源文档名"标注引用来源');
  });
});
