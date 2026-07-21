export type ChatModelStatus = {
  provider: "qwen" | "demo";
  providerLabel: string;
  chatModel: string | null;
  displayName: string;
};

/** 当前真实调用的聊天模型；后续增加提供商时由此处统一扩展。 */
export function currentChatModel(): ChatModelStatus {
  if (!process.env.QWEN_API_KEY) {
    return {
      provider: "demo",
      providerLabel: "演示模式",
      chatModel: null,
      displayName: "演示模式（未配置模型）",
    };
  }
  const chatModel = process.env.QWEN_CHAT_MODEL || "qwen-plus";
  return {
    provider: "qwen",
    providerLabel: "通义千问",
    chatModel,
    displayName: `通义千问 · ${chatModel}`,
  };
}
