export type ModelPrice = { inputPerMillion: number; outputPerMillion?: number; updatedAt: string };

/** 费用为后台估算值；更新时请以百炼控制台的模型价格为准。 */
export const RAG_MODEL_PRICES: Record<string, ModelPrice> = {
  "qwen3.7-plus": { inputPerMillion: 1.6, outputPerMillion: 6.4, updatedAt: "2026-07-20" },
  "qwen-plus": { inputPerMillion: 2, outputPerMillion: 8, updatedAt: "2026-07-20" },
  "text-embedding-v3": { inputPerMillion: 0.7, updatedAt: "2026-07-20" },
};

export function estimateModelCost(model: string, inputTokens: number, outputTokens = 0): number {
  const price = RAG_MODEL_PRICES[model];
  if (!price) return 0;
  return (inputTokens / 1_000_000) * price.inputPerMillion +
    (outputTokens / 1_000_000) * (price.outputPerMillion || 0);
}
