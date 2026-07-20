import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { listDocuments, removeDocument, upsertMarkdownDocument } from "@/lib/rag";
import { MarkdownDocumentInput, previewMarkdownBatch } from "@/lib/rag-documents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILES = 20;
const MAX_FILE_BYTES = 256 * 1024;
const MAX_TOTAL_BYTES = 1024 * 1024;

function guard(): boolean {
  return verifyToken(cookies().get("admin_token")?.value);
}

async function filesFrom(form: FormData): Promise<MarkdownDocumentInput[]> {
  const files = form.getAll("files").filter((value): value is File => value instanceof File);
  if (!files.length) throw new Error("请选择 Markdown 文件");
  if (files.length > MAX_FILES) throw new Error(`一次最多上传 ${MAX_FILES} 个文件`);
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_TOTAL_BYTES) throw new Error("本次上传总大小不能超过 1MB");

  return Promise.all(
    files.map(async (file) => {
      if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} 超过 256KB 限制`);
      return { fileName: file.name, content: await file.text() };
    })
  );
}

export async function GET() {
  if (!guard()) return NextResponse.json({ error: "未登录" }, { status: 401 });
  return NextResponse.json({ documents: await listDocuments() });
}

export async function POST(req: NextRequest) {
  if (!guard()) return NextResponse.json({ error: "未登录" }, { status: 401 });
  try {
    const form = await req.formData();
    const files = await filesFrom(form);
    const preview = previewMarkdownBatch(files);
    if (form.get("action") === "preview") return NextResponse.json(preview);

    const results = [] as { fileName: string; ok: boolean; error?: string }[];
    for (const file of files) {
      try {
        await upsertMarkdownDocument(file);
        results.push({ fileName: file.fileName, ok: true });
      } catch (error: any) {
        results.push({ fileName: file.fileName, ok: false, error: error?.message || "导入失败" });
      }
    }
    return NextResponse.json({ results, documents: await listDocuments() });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "文档预检失败" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!guard()) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少文档标识" }, { status: 400 });
  const deleted = await removeDocument(id);
  if (!deleted) return NextResponse.json({ error: "文档不存在" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
