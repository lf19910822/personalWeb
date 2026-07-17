import { readJson, writeJson } from "./storage";

export type Visitor = {
  id: string;
  name: string;
  company: string;
  ip: string;
  ua: string;
  browser: string;
  os: string;
  device: string;
  referer: string;
  country: string;
  city: string;
  isBot: boolean;
  createdAt: string;
};

const KEY = "visitors.json";

function parseUA(ua: string): { browser: string; os: string; device: string } {
  let browser = "未知";
  let os = "未知";
  let device = "桌面";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = "Safari";
  else if (/QQBrowser\//.test(ua)) browser = "QQ 浏览器";

  if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/(iPhone|iPad|iPod)/.test(ua)) os = "iOS";
  else if (/Linux/.test(ua)) os = "Linux";

  if (/Mobile/.test(ua)) device = "手机";
  else if (/Tablet/.test(ua)) device = "平板";
  return { browser, os, device };
}

export async function saveVisitor(input: {
  name: string;
  company?: string;
  ip: string;
  ua: string;
  referer?: string;
  country?: string;
  city?: string;
  isBot: boolean;
}): Promise<Visitor> {
  const list = await readJson<Visitor[]>(KEY, []);
  const { browser, os, device } = parseUA(input.ua);
  const v: Visitor = {
    id: "v-" + Date.now().toString(36),
    name: input.name,
    company: input.company || "",
    ip: input.ip,
    ua: input.ua,
    browser,
    os,
    device,
    referer: input.referer || "",
    country: input.country || "",
    city: input.city || "",
    isBot: input.isBot,
    createdAt: new Date().toISOString(),
  };
  list.push(v);
  await writeJson(KEY, list);
  return v;
}

export async function listVisitors(): Promise<Visitor[]> {
  const list = await readJson<Visitor[]>(KEY, []);
  return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
