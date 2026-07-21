import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import {
  createProjectCard,
  deleteProjectCard,
  listProjectCards,
  ProjectCardInput,
  ProjectStatus,
  updateProjectCard,
} from "@/lib/project-cards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function guard(): boolean {
  return verifyToken(cookies().get("admin_token")?.value);
}

function projectInput(body: any): ProjectCardInput {
  return {
    title: body.title,
    summary: body.summary,
    background: body.background,
    role: body.role,
    solutions: body.solutions,
    results: body.results,
    tags: body.tags,
    sortOrder: body.sortOrder,
    relatedDocumentId: body.relatedDocumentId,
  };
}

export async function GET() {
  if (!guard()) return NextResponse.json({ error: "未登录" }, { status: 401 });
  return NextResponse.json({ projects: await listProjectCards() });
}

export async function POST(req: NextRequest) {
  if (!guard()) return NextResponse.json({ error: "未登录" }, { status: 401 });
  try {
    const card = await createProjectCard(projectInput(await req.json()));
    return NextResponse.json({ project: card }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "创建项目失败" }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  if (!guard()) return NextResponse.json({ error: "未登录" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.id || typeof body.id !== "string") return NextResponse.json({ error: "缺少项目标识" }, { status: 400 });
    const project = await updateProjectCard(body.id, { ...projectInput(body), status: body.status as ProjectStatus });
    if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    return NextResponse.json({ project });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "更新项目失败" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!guard()) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少项目标识" }, { status: 400 });
  if (!(await deleteProjectCard(id))) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
