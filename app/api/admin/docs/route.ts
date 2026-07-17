import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { addDoc, getCorpusMeta } from "@/lib/rag";
export const dynamic = "force-dynamic";

export const runtime = "nodejs";

function guard(): boolean {
  const token = cookies().get("admin_token")?.value;
  return verifyToken(token);
}

export async function GET() {
  if (!guard()) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const docs = await getCorpusMeta();
  return NextResponse.json({ docs });
}

export async function POST(req: NextRequest) {
  if (!guard()) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { title, intro, content } = await req.json();
  if (!title || !content) {
    return NextResponse.json({ error: "标题与内容必填" }, { status: 400 });
  }
  // 自动切分 + (配 Key 时)向量化 + 进内存语料库
  const r = await addDoc({ title, intro: intro || "", content });
  return NextResponse.json({ ok: true, id: r.id });
}
