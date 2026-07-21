import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AiAssistant from "../components/AiAssistant";

afterEach(() => vi.unstubAllGlobals());

describe("AI 助手流式回答", () => {
  it("在响应尚未结束时逐段展示 Markdown 回答和引用来源", async () => {
    const encoder = new TextEncoder();
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
    const response = new Response(
      new ReadableStream({ start(next) { controller = next; } }),
      { status: 200, headers: { "Content-Type": "text/event-stream" } }
    );
    vi.stubGlobal(
      "fetch",
      vi.fn((input: string) => {
        if (input === "/api/corpus") return Promise.resolve(new Response(JSON.stringify({ docs: [] })));
        if (input === "/api/chat") return Promise.resolve(response);
        return Promise.resolve(new Response(null, { status: 404 }));
      })
    );

    render(<AiAssistant />);
    fireEvent.change(screen.getByRole("textbox", { name: "提问输入框" }), { target: { value: "有哪些项目成果？" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));

    await waitFor(() => expect(controller).toBeDefined());
    await act(async () => {
      controller!.enqueue(encoder.encode('event: sources\ndata: {"sources":["项目复盘"]}\n\nevent: delta\ndata: {"text":"## 项目"}\n\n'));
    });
    expect(screen.queryByRole("heading", { level: 2, name: "项目" })).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 2, name: "项目" })).toBeInTheDocument();
    expect(screen.getByText("📎 引用:项目复盘")).toBeInTheDocument();

    await act(async () => {
      controller!.enqueue(encoder.encode('event: delta\ndata: {"text":"成果\\n\\n- 首屏优化"}\n\nevent: done\ndata: {}\n\n'));
      controller!.close();
    });
    expect(await screen.findByRole("heading", { level: 2, name: "项目成果" })).toBeInTheDocument();
    expect(await screen.findByText("首屏优化")).toBeInTheDocument();
  });
});
