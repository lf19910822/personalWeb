import { afterEach, describe, expect, it, vi } from "vitest";
import { scrollToElement } from "../lib/smooth-scroll";

afterEach(() => vi.unstubAllGlobals());

describe("项目卡片自动滚动", () => {
  it("滚动动画期间阻止滚轮，并在取消或结束后立刻恢复", () => {
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

    const target = document.createElement("article");
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({ top: 1000, height: 100 } as DOMRect);

    const cancel = scrollToElement(target);
    const duringAnimation = new Event("wheel", { cancelable: true });
    window.dispatchEvent(duringAnimation);
    expect(duringAnimation.defaultPrevented).toBe(true);

    cancel();
    const afterCancellation = new Event("wheel", { cancelable: true });
    window.dispatchEvent(afterCancellation);
    expect(afterCancellation.defaultPrevented).toBe(false);

    frames.length = 0;
    scrollToElement(target);
    frames.shift()!(0);
    frames.shift()!(500);
    const afterCompletion = new Event("wheel", { cancelable: true });
    window.dispatchEvent(afterCompletion);
    expect(afterCompletion.defaultPrevented).toBe(false);
  });
});
