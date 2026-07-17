import { randomUUID } from "crypto";
import { readJson, writeJson } from "./storage";

/**
 * 留言存储:经统一对象存储层(本地文件降级 / 腾讯云 COS 持久化)。
 * 单 JSON 数组,读-改-写;低流量足够。多实例部署请改用数据库。
 */
const KEY = "messages.json";

export type Message = {
  id: string;
  name: string;
  email: string;
  text: string;
  createdAt: string;
};

export async function saveMessage(m: Omit<Message, "id" | "createdAt">): Promise<Message> {
  const full: Message = {
    ...m,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const arr = await readJson<Message[]>(KEY, []);
  arr.push(full);
  await writeJson(KEY, arr);
  return full;
}

export async function listMessages(): Promise<Message[]> {
  const arr = await readJson<Message[]>(KEY, []);
  return arr.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
