import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const DATA = path.join(process.cwd(), "data");
const FILE = path.join(DATA, "messages.json");

export type Message = {
  id: string;
  name: string;
  email: string;
  text: string;
  createdAt: string;
};

/** 保存留言(开发期写本地文件;生产期可替换为 Postgres) */
export async function saveMessage(m: Omit<Message, "id" | "createdAt">): Promise<Message> {
  const full: Message = {
    ...m,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  let arr: Message[] = [];
  try {
    const raw = await fs.readFile(FILE, "utf8");
    arr = JSON.parse(raw);
  } catch {
    // 文件不存在则新建
  }
  arr.push(full);
  await fs.writeFile(FILE, JSON.stringify(arr, null, 2), "utf8");
  return full;
}

export async function listMessages(): Promise<Message[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
