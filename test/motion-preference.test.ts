import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("动态效果", () => {
  it("不保留可关闭动画的样式开关", () => {
    const styles = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

    expect(styles).not.toContain("prefers-reduced-motion");
    expect(styles).not.toContain("data-reduce-motion");
  });
});
