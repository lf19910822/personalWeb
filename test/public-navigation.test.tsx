import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Sidebar from "../components/Sidebar";

describe("公开侧栏", () => {
  it("不向访客提供后台入口", () => {
    render(<Sidebar />);

    expect(screen.queryByRole("link", { name: "后台" })).not.toBeInTheDocument();
  });

  it("默认开启动态效果，并允许访客减少动态效果", () => {
    document.documentElement.setAttribute("data-reduce-motion", "false");
    render(<Sidebar />);

    const control = screen.getByRole("button", { name: "减少动态效果" });
    expect(control).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(control);
    expect(control).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement).toHaveAttribute("data-reduce-motion", "true");
  });
});
