import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProjectCases from "../components/ProjectCases";
import Reveal from "../components/Reveal";

afterEach(() => vi.unstubAllGlobals());

describe("公开项目案例", () => {
  it("展示已发布项目，并将项目追问交给 AI 助手", async () => {
    const onAsk = vi.fn();
    window.addEventListener("ask-project-ai", onAsk);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ projects: [{
        id: "cost-hub",
        title: "Cost Hub 多源成本数据平台",
        summary: "多源成本数据同步与项目归集。",
        background: "成本数据分散。",
        role: "负责后端架构。",
        solutions: ["本地查询缓存"],
        results: ["查询不依赖外部系统"],
        tags: ["Go", "PostgreSQL"],
        sortOrder: 1,
      }] })))
    );

    render(<ProjectCases />);

    expect(await screen.findByRole("heading", { name: "Cost Hub 多源成本数据平台" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "向 AI 了解此项目" }));
    expect(onAsk).toHaveBeenCalledWith(expect.objectContaining({ detail: expect.stringContaining("Cost Hub") }));
    window.removeEventListener("ask-project-ai", onAsk);
  });

  it("点击上方标题条后，将对应项目移到展开位而不请求后台更新", async () => {
    document.documentElement.setAttribute("data-reduce-motion", "false");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ projects: [
        { id: "one", title: "项目一", summary: "一", background: "一", role: "一", solutions: ["一"], results: ["一"], tags: ["Go"], sortOrder: 1 },
        { id: "two", title: "项目二", summary: "二", background: "二", role: "二", solutions: ["二"], results: ["二"], tags: ["Go"], sortOrder: 2 },
        { id: "three", title: "项目三", summary: "三", background: "三", role: "三", solutions: ["三"], results: ["三"], tags: ["Go"], sortOrder: 3 },
      ] })))
    );

    render(<ProjectCases />);

    expect(await screen.findByRole("heading", { name: "项目三" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "展开项目一" }));
    const activeCard = screen.getByRole("heading", { name: "项目一" }).closest("article");
    expect(activeCard).toHaveClass("is-moving-to-active");
    expect(activeCard).toHaveStyle({ "--from-stack-offset": "0px" });
    expect(screen.getByRole("button", { name: "展开项目三" })).toBeInTheDocument();
  });

  it("站内未开启减少动态时，系统偏好不应取消项目切换的平滑滚动", async () => {
    document.documentElement.setAttribute("data-reduce-motion", "false");
    const scrollIntoView = vi.fn();
    const requestAnimationFrame = vi.fn(() => 1);
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: scrollIntoView });
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    vi.stubGlobal("requestAnimationFrame", requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ projects: [
        { id: "one", title: "项目一", summary: "一", background: "一", role: "一", solutions: ["一"], results: ["一"], tags: ["Go"], sortOrder: 1 },
        { id: "two", title: "项目二", summary: "二", background: "二", role: "二", solutions: ["二"], results: ["二"], tags: ["Go"], sortOrder: 2 },
      ] })))
    );

    render(<ProjectCases />);

    expect(await screen.findByRole("heading", { name: "项目二" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "展开项目一" }));
    await waitFor(() => expect(requestAnimationFrame).toHaveBeenCalledTimes(1));
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("异步加载的项目区进入视口后也会显示", async () => {
    class ImmediatelyIntersectingObserver {
      constructor(private callback: IntersectionObserverCallback) {}

      observe(target: Element) {
        this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }

      unobserve() {}
      disconnect() {}
    }

    vi.stubGlobal("IntersectionObserver", ImmediatelyIntersectingObserver);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ projects: [{
        id: "cost-hub",
        title: "Cost Hub",
        summary: "简介",
        background: "背景",
        role: "职责",
        solutions: ["方案"],
        results: ["成果"],
        tags: ["Go"],
        sortOrder: 1,
      }] })))
    );

    render(<><ProjectCases /><Reveal /></>);

    await screen.findByRole("heading", { name: "Cost Hub" });
    await waitFor(() => expect(document.querySelector("#projects")).toHaveClass("in"));
  });

  it("在 500ms 内以缓入缓出方式滚动到新展开的项目卡片", async () => {
    document.documentElement.setAttribute("data-reduce-motion", "false");
    const frames: FrameRequestCallback[] = [];
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    const scrollTo = vi.fn();
    vi.stubGlobal("requestAnimationFrame", requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("scrollTo", scrollTo);
    Object.defineProperty(window, "scrollY", { configurable: true, value: 100 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
    Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: 2000 });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ projects: [
        { id: "one", title: "项目一", summary: "一", background: "一", role: "一", solutions: ["一"], results: ["一"], tags: ["Go"], sortOrder: 1 },
        { id: "two", title: "项目二", summary: "二", background: "二", role: "二", solutions: ["二"], results: ["二"], tags: ["Go"], sortOrder: 2 },
      ] })))
    );

    render(<ProjectCases />);

    await screen.findByRole("heading", { name: "项目二" });
    const firstCard = screen.getByRole("button", { name: "展开项目一" }).closest("article");
    expect(firstCard).not.toBeNull();
    vi.spyOn(firstCard!, "getBoundingClientRect").mockReturnValue({ top: 1000, height: 100 } as DOMRect);

    fireEvent.click(screen.getByRole("button", { name: "展开项目一" }));
    await waitFor(() => expect(requestAnimationFrame).toHaveBeenCalledTimes(1));

    frames.shift()!(0);
    frames.shift()!(125);
    frames.shift()!(250);
    frames.shift()!(375);
    frames.shift()!(500);

    expect(scrollTo).toHaveBeenNthCalledWith(2, { top: 137.5, behavior: "auto" });
    expect(scrollTo).toHaveBeenNthCalledWith(3, { top: 400, behavior: "auto" });
    expect(scrollTo).toHaveBeenNthCalledWith(4, { top: 662.5, behavior: "auto" });
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 700, behavior: "auto" });
  });
});
