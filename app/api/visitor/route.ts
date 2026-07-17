import { NextRequest, NextResponse } from "next/server";
import { saveVisitor } from "@/lib/visitors";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BOT_RE =
  /bot|crawl|spider|slurp|google|baidu|yandex|duckduckbot|sogou|360spider|bytespider|telegrambot|twitterbot|linkedinbot|whatsapp|facebookexternalhit|meta-externalagent/i;

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {}
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "请填写你的称呼" }, { status: 400 });

  const ua = req.headers.get("user-agent") || "";
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const referer = req.headers.get("referer") || "";
  const country =
    req.headers.get("x-country") ||
    req.headers.get("cf-ipcountry") ||
    "";
  const city = req.headers.get("x-city") || "";
  const isBot = BOT_RE.test(ua);

  await saveVisitor({
    name,
    company: String(body.company || "").trim(),
    ip,
    ua,
    referer,
    country,
    city,
    isBot,
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("visitor_token", randomUUID(), {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
