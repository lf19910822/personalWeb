import { afterEach, describe, expect, it, vi } from "vitest";
import { scrollToPageElement } from "../lib/smooth-scroll";

afterEach(() => vi.unstubAllGlobals());

describe("统一页面滚动", () => {
  it("使用与项目卡片相同的动画，并在动画期间锁定滚轮", () => {
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
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({ top: 1000, height: 100 } as DOMRect);

    const cancel = scrollToPageElement(target);
    expect(frames).toHaveLength(1);
    const wheel = new Event("wheel", { cancelable: true });
    window.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(true);

    cancel();
    const afterCancellation = new Event("wheel", { cancelable: true });
    window.dispatchEvent(afterCancellation);
    expect(afterCancellation.defaultPrevented).toBe(false);
  });
});
