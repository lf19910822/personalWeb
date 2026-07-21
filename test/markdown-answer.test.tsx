import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MarkdownAnswer from "../components/MarkdownAnswer";

describe("AI 回答 Markdown 渲染", () => {
  it("渲染标题、强调、列表、链接、代码块与表格，而不是输出原始 Markdown 符号", () => {
    render(
      <MarkdownAnswer
        content={`## 项目成果

**性能提升**，详见[案例](https://example.com)。

- 首屏优化
- 设计系统

| 指标 | 结果 |
| --- | --- |
| LCP | 1.8s |

\`const enabled = true;\``}
      />
    );

    expect(screen.getByRole("heading", { level: 2, name: "项目成果" })).toBeInTheDocument();
    expect(screen.getByRole("strong")).toHaveTextContent("性能提升");
    expect(screen.getByRole("link", { name: "案例" })).toHaveAttribute("href", "https://example.com");
    expect(screen.getByRole("list")).toHaveTextContent("首屏优化");
    expect(screen.getByRole("table")).toHaveTextContent("LCP");
    expect(screen.getByText("const enabled = true;")).toHaveProperty("tagName", "CODE");
  });
});
