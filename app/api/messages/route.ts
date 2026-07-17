import { NextRequest, NextResponse } from "next/server";
import { saveMessage } from "@/lib/store";
import { notifyMessage } from "@/lib/email";
export const dynamic = "force-dynamic";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const text = String(body.text || "").trim();
    if (!name || !email || !text) {
      return NextResponse.json({ error: "请填写称呼、邮箱和留言内容" }, { status: 400 });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
    }
    await saveMessage({ name, email, text });
    const mail = await notifyMessage({ name, email, text });
    return NextResponse.json({ ok: true, mail });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "内部错误" }, { status: 500 });
  }
}
