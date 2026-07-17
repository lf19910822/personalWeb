import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs/promises";
import path from "path";
import { verifyToken } from "@/lib/auth";
import { getCorpusMeta } from "@/lib/rag";
import { embed } from "@/lib/llm";
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
  const chunks = String(content)
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  const id = "doc-" + Date.now().toString(36);

  // 写入语料
  const corpusPath = path.join(process.cwd(), "data", "corpus.json");
  const json = JSON.parse(await fs.readFile(corpusPath, "utf8"));
  json.docs.push({ id, title, intro: intro || "", chunks });
  await fs.writeFile(corpusPath, JSON.stringify(json, null, 2), "utf8");

  // 配置 Key 时计算 embedding 入库
  if (process.env.QWEN_API_KEY) {
    try {
      const vectorsPath = path.join(process.cwd(), "data", "vectors.json");
      let vjson: { embeddings: any[] } = { embeddings: [] };
      try {
        vjson = JSON.parse(await fs.readFile(vectorsPath, "utf8"));
      } catch {}
      for (const c of chunks) {
        const vector = await embed(c);
        vjson.embeddings.push({ docId: id, text: c, vector });
      }
      await fs.writeFile(vectorsPath, JSON.stringify(vjson, null, 2), "utf8");
    } catch (e) {
      console.error("[admin/docs] embedding 失败", e);
    }
  }

  return NextResponse.json({ ok: true, id });
}
