import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { listMessages } from "@/lib/store";
export const dynamic = "force-dynamic";

export const runtime = "nodejs";

export async function GET() {
  const token = cookies().get("admin_token")?.value;
  if (!verifyToken(token)) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const messages = await listMessages();
  return NextResponse.json({ messages });
}
