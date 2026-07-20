import { describe, expect, it } from "vitest";
import { getDistDir } from "../next.config.mjs";

describe("Next 生成目录", () => {
  it("隔离开发服务器与生产构建的生成文件", () => {
    expect(getDistDir("development")).toBe(".next-dev");
    expect(getDistDir("production")).toBe(".next");
  });
});
