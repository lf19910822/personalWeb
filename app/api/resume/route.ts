import { NextResponse } from "next/server";
import { getObject } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const obj = await getObject("resume.pdf");
  if (!obj) return NextResponse.json({ error: "简历尚未上传" }, { status: 404 });
  return new NextResponse(new Blob([new Uint8Array(obj.body)]), {
    headers: {
      "Content-Type": obj.contentType || "application/pdf",
      "Content-Disposition": 'inline; filename="resume.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
