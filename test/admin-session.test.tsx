import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Admin from "../app/admin/page";

afterEach(() => vi.unstubAllGlobals());

describe("管理员会话", () => {
  it("存在有效登录 cookie 时自动恢复后台界面", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input === "/api/admin/status") {
          return new Response(JSON.stringify({ llm: true, mail: false, storage: "cos", docCount: 1, messageCount: 0, visitorCount: 0 }), { status: 200 });
        }
        if (input === "/api/admin/messages") return new Response(JSON.stringify({ messages: [] }), { status: 200 });
        if (input === "/api/admin/docs") return new Response(JSON.stringify({ documents: [] }), { status: 200 });
        if (input === "/api/admin/usage") return new Response(JSON.stringify({ days: [] }), { status: 200 });
        return new Response(null, { status: 404 });
      })
    );

    render(<Admin />);

    expect(await screen.findByRole("heading", { name: "管理后台" })).toBeInTheDocument();
  });
});
