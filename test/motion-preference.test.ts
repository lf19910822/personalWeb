import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("动态效果偏好", () => {
  it("不受操作系统的减少动态效果偏好覆盖", () => {
    const styles = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

    expect(styles).not.toContain("prefers-reduced-motion");
  });
});
