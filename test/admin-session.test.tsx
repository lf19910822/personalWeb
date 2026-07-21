import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Admin from "../app/admin/page";

afterEach(() => vi.unstubAllGlobals());

describe("管理员会话", () => {
  it("存在有效登录 cookie 时自动恢复后台界面", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input === "/api/admin/status") {
          return new Response(JSON.stringify({ llm: true, model: { provider: "qwen", displayName: "通义千问 · qwen-plus" }, mail: false, storage: "cos", docCount: 1, messageCount: 0, visitorCount: 0 }), { status: 200 });
        }
        if (input === "/api/admin/messages") return new Response(JSON.stringify({ messages: [] }), { status: 200 });
        if (input === "/api/admin/docs") return new Response(JSON.stringify({ documents: [] }), { status: 200 });
        if (input === "/api/admin/projects") return new Response(JSON.stringify({ projects: [] }), { status: 200 });
        if (input === "/api/admin/usage") return new Response(JSON.stringify({ days: [] }), { status: 200 });
        return new Response(null, { status: 404 });
      })
    );

    render(<Admin />);

    expect(await screen.findByRole("heading", { name: "管理后台" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "概览" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "AI 配置" }));
    expect(screen.getByRole("combobox", { name: "聊天模型提供商" })).toHaveValue("qwen");
    expect(screen.getByText("当前实际模型")).toBeInTheDocument();
    expect(screen.getByText("通义千问 · qwen-plus")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "项目" }));
    expect(screen.getByRole("heading", { name: "项目卡片" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "项目名称" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存草稿" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发布" })).toBeInTheDocument();
  });
});
