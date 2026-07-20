import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Sidebar from "../components/Sidebar";

describe("公开侧栏", () => {
  it("不向访客提供后台入口", () => {
    render(<Sidebar />);

    expect(screen.queryByRole("link", { name: "后台" })).not.toBeInTheDocument();
  });
});
