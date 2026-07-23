import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("项目卡片内容网格", () => {
  it("四个内容区都有分割线，且标题紧随分割线", () => {
    const styles = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

    expect(styles).toContain(".project-card-grid > section {");
    expect(styles).toContain("border-top: 1px solid var(--line);");
    expect(styles).toContain("padding: 12px 0 0;");
  });
});
