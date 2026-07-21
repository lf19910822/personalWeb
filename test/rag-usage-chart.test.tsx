import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UsageChart, buildUsageTimeline, type UsageDay } from "../app/admin/usage-chart";

const emptyEntry = { requests: 0, inputTokens: 0, outputTokens: 0, estimatedCost: 0 };

function usageDay(date: string, chatTokens: number): UsageDay {
  return {
    date,
    chat: { ...emptyEntry, requests: 1, inputTokens: chatTokens },
    embedding: { ...emptyEntry },
  };
}

describe("RAG 用量趋势图", () => {
  it("补齐没有调用的日期，以便按自然日显示最近三十天", () => {
    const days = buildUsageTimeline(
      [usageDay("2026-03-16", 120)],
      new Date("2026-03-16T12:00:00.000Z")
    );

    expect(days).toHaveLength(30);
    expect(days[0].date).toBe("2026-02-15");
    expect(days.at(-1)).toMatchObject({ date: "2026-03-16", chat: { inputTokens: 120 } });
  });

  it("显示带 Token 网格与日期刻度的图表，并可拖拽查看更早的日期", () => {
    const usage = Array.from({ length: 45 }, (_, index) => {
      const date = new Date(Date.UTC(2026, 0, 31 + index));
      return usageDay(date.toISOString().slice(0, 10), (index + 1) * 10);
    });
    render(<UsageChart usage={usage} now={new Date("2026-03-16T12:00:00.000Z")} />);

    const chart = screen.getByRole("img", { name: "RAG 用量趋势图" });
    Object.defineProperty(chart, "setPointerCapture", { value: () => undefined });
    Object.defineProperty(chart, "releasePointerCapture", { value: () => undefined });

    expect(screen.getByText("Token（每日）")).toBeInTheDocument();
    expect(screen.getByTestId("usage-range")).toHaveTextContent("2026-02-15 至 2026-03-16");

    fireEvent.pointerDown(chart, { pointerId: 1, clientX: 500 });
    fireEvent.pointerMove(chart, { pointerId: 1, clientX: 850 });
    fireEvent.pointerUp(chart, { pointerId: 1 });

    expect(screen.getByTestId("usage-range")).toHaveTextContent("2026-01-31 至 2026-03-01");
  });

  it("没有超过三十天的历史时，不把不可移动的图表伪装成可拖拽", () => {
    render(<UsageChart usage={[usageDay("2026-03-16", 120)]} now={new Date("2026-03-16T12:00:00.000Z")} />);

    expect(screen.getByText("当前没有更早的历史用量可供拖拽查看。继续使用后可回看历史区间。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "查看更早记录" })).toBeDisabled();
  });
});
