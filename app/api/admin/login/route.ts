import { NextRequest, NextResponse } from "next/server";
import { checkCredentials, makeToken } from "@/lib/auth";
export const dynamic = "force-dynamic";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { user, pass } = await req.json();
  if (!checkCredentials(String(user || ""), String(pass || ""))) {
    return NextResponse.json({ error: "账号或密码错误" }, { status: 401 });
  }
  const token = makeToken(String(user || ""));
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
