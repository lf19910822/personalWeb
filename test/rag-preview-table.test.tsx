import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RagPreviewTable } from "../app/admin/rag-preview-table";

describe("RAG 文档预检表格", () => {
  it("以表格展示每份文档的切分、Token 与费用预估", () => {
    render(
      <RagPreviewTable
        previews={[
          {
            documentId: "project-a.md",
            title: "项目 A 复盘",
            intro: "首屏性能优化与设计系统建设。",
            parentCount: 2,
            childCount: 5,
            estimatedEmbeddingTokens: 1234,
            estimatedEmbeddingCost: 0.0123,
          },
        ]}
      />
    );

    const table = screen.getByRole("table", { name: /RAG 文档预检结果/ });
    expect(within(table).getByRole("columnheader", { name: "文档" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "父块" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "子块" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "预估 Token" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "预估费用" })).toBeInTheDocument();
    expect(within(table).getByText("项目 A 复盘")).toBeInTheDocument();
    expect(within(table).getByText("project-a.md")).toBeInTheDocument();
    expect(within(table).getByText("1,234")).toBeInTheDocument();
    expect(within(table).getByText("¥0.0123")).toBeInTheDocument();
  });
});
