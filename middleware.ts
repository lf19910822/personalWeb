import { NextResponse, NextRequest } from "next/server";

/**
 * 中间件:① 访客身份门禁 ② 简单限流。
 *
 * 门禁:真人首次访问弹身份卡(/gate),提交后种 cookie,老访客/爬虫放行。
 * 爬虫(SEO 机器人)直接放行,保证 HR 用搜索引擎能收录本站。
 * 限流:对 /api/chat、/api/messages 按 IP 做滑动窗口,防大模型费用被刷。
 *       (单实例内存实现;多实例/生产高并发请换 Redis。)
 */

const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|meta-externalagent|google|baidu|yandex|duckduckbot|sogou|360spider|bytespider|semrush|ahrefs|telegrambot|twitterbot|linkedinbot|whatsapp/i;

const WINDOW = 60_000; // 1 分钟窗口
const CHAT_LIMIT = 15; // 每 IP 每分钟聊天次数
const MSG_LIMIT = 10; // 每 IP 每分钟留言次数

const hits = new Map<string, number[]>();

function limited(ip: string, limit: number): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW);
  if (arr.length >= limit) {
    hits.set(ip, arr);
    return true;
  }
  arr.push(now);
  hits.set(ip, arr);
  return false;
}

function isBot(ua: string): boolean {
  return BOT_RE.test(ua);
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ua = req.headers.get("user-agent") || "";

  // 限流(仅 API)
  if (pathname === "/api/chat" && limited(clientIp(req), CHAT_LIMIT)) {
    return new NextResponse(
      JSON.stringify({ error: "提问太频繁了,请稍后再试～" }),
      { status: 429, headers: { "content-type": "application/json" } }
    );
  }
  if (pathname === "/api/messages" && limited(clientIp(req), MSG_LIMIT)) {
    return new NextResponse(JSON.stringify({ error: "提交太频繁,请稍后再试" }), {
      status: 429,
      headers: { "content-type": "application/json" },
    });
  }

  // 跳过:后台 / API / 门禁页 / 静态资源
  const skip = ["/admin", "/api", "/gate", "/_next", "/favicon"].some((p) =>
    pathname.startsWith(p)
  );
  if (skip) return NextResponse.next();

  // 爬虫放行(SEO)
  if (isBot(ua)) return NextResponse.next();

  // 真人未验证 → 弹身份卡
  if (!req.cookies.get("visitor_token")) {
    const url = req.nextUrl.clone();
    url.pathname = "/gate";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
