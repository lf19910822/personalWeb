import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { getRagUsage } from "@/lib/rag-usage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!verifyToken(cookies().get("admin_token")?.value)) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  return NextResponse.json({ days: await getRagUsage() });
}
