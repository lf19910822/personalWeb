import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Hero from "../components/Hero";

afterEach(() => vi.unstubAllGlobals());

describe("首屏导航", () => {
  it("向 AI 提问使用统一的页面滚动", () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("scrollTo", vi.fn());
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
    Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: 2000 });
    const target = document.createElement("section");
    target.id = "ai";
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({ top: 1000, height: 100 } as DOMRect);
    document.body.append(target);

    render(<Hero />);
    fireEvent.click(screen.getByRole("link", { name: "向 AI 提问 →" }));

    expect(frames).toHaveLength(1);
    frames.shift()!(0);
    frames.shift()!(500);
    target.remove();
  });
});
