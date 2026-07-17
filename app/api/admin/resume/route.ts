import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { putObject, getObject, deleteObject } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function guard() {
  return verifyToken(cookies().get("admin_token")?.value);
}

export async function GET() {
  if (!guard()) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const obj = await getObject("resume.pdf");
  if (!obj) return NextResponse.json({ exists: false });
  return NextResponse.json({ exists: true, size: obj.body.length });
}

export async function POST(req: NextRequest) {
  if (!guard()) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请选择 PDF 文件" }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.byteLength === 0) {
    return NextResponse.json({ error: "文件为空" }, { status: 400 });
  }
  if (buf.byteLength > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "文件过大(>10MB)" }, { status: 400 });
  }
  await putObject("resume.pdf", buf, "application/pdf");
  return NextResponse.json({ ok: true, size: buf.byteLength });
}

export async function DELETE() {
  if (!guard()) return NextResponse.json({ error: "未登录" }, { status: 401 });
  await deleteObject("resume.pdf");
  return NextResponse.json({ ok: true });
}
