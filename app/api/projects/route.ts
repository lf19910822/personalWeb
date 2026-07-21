import { NextResponse } from "next/server";
import { listPublishedProjectCards } from "@/lib/project-cards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ projects: await listPublishedProjectCards() });
}
