import { estimateModelCost } from "@/config/rag-pricing";
import { readJson, writeJson } from "./storage";

export type UsageKind = "chat" | "embedding";
export type UsageEntry = { requests: number; inputTokens: number; outputTokens: number; estimatedCost: number };
export type DailyUsage = { date: string; chat: UsageEntry; embedding: UsageEntry };
const KEY = "rag/usage.json";
const empty = (): UsageEntry => ({ requests: 0, inputTokens: 0, outputTokens: 0, estimatedCost: 0 });

export async function recordRagUsage(input: {
  kind: UsageKind;
  model: string;
  inputTokens: number;
  outputTokens?: number;
}): Promise<void> {
  const date = new Date().toISOString().slice(0, 10);
  const days = await readJson<DailyUsage[]>(KEY, []);
  let day = days.find((item) => item.date === date);
  if (!day) {
    day = { date, chat: empty(), embedding: empty() };
    days.push(day);
  }
  const entry = day[input.kind];
  const outputTokens = input.outputTokens || 0;
  entry.requests += 1;
  entry.inputTokens += input.inputTokens;
  entry.outputTokens += outputTokens;
  entry.estimatedCost += estimateModelCost(input.model, input.inputTokens, outputTokens);
  await writeJson(KEY, days);
}

export async function getRagUsage(): Promise<DailyUsage[]> {
  return readJson<DailyUsage[]>(KEY, []);
}
