import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProjectCases from "../components/ProjectCases";

describe("公开项目案例", () => {
  it("展示已发布项目，并将项目追问交给 AI 助手", async () => {
    const onAsk = vi.fn();
    window.addEventListener("ask-project-ai", onAsk);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ projects: [{
        id: "cost-hub",
        title: "Cost Hub 多源成本数据平台",
        summary: "多源成本数据同步与项目归集。",
        background: "成本数据分散。",
        role: "负责后端架构。",
        solutions: ["本地查询缓存"],
        results: ["查询不依赖外部系统"],
        tags: ["Go", "PostgreSQL"],
        sortOrder: 1,
      }] })))
    );

    render(<ProjectCases />);

    expect(await screen.findByRole("heading", { name: "Cost Hub 多源成本数据平台" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "向 AI 了解此项目" }));
    expect(onAsk).toHaveBeenCalledWith(expect.objectContaining({ detail: expect.stringContaining("Cost Hub") }));
    window.removeEventListener("ask-project-ai", onAsk);
  });
});
