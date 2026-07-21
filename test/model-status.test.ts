import { afterEach, describe, expect, it } from "vitest";
import { currentChatModel } from "../lib/model-status";

afterEach(() => {
  delete process.env.QWEN_API_KEY;
  delete process.env.QWEN_CHAT_MODEL;
});

describe("当前聊天模型状态", () => {
  it("配置 Qwen 后报告实际使用的模型名称", () => {
    process.env.QWEN_API_KEY = "test-key";
    process.env.QWEN_CHAT_MODEL = "qwen-plus";

    expect(currentChatModel()).toEqual({
      provider: "qwen",
      providerLabel: "通义千问",
      chatModel: "qwen-plus",
      displayName: "通义千问 · qwen-plus",
    });
  });

  it("没有模型凭据时报告演示模式", () => {
    expect(currentChatModel()).toEqual({
      provider: "demo",
      providerLabel: "演示模式",
      chatModel: null,
      displayName: "演示模式（未配置模型）",
    });
  });
});
