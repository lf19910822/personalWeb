"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type UsageEntry = {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
};

export type UsageDay = {
  date: string;
  chat: UsageEntry;
  embedding: UsageEntry;
};

type ChartDay = UsageDay & {
  chatTokens: number;
  embeddingTokens: number;
  totalTokens: number;
  requests: number;
  estimatedCost: number;
};

const WINDOW_DAYS = 30;
const CHART_WIDTH = 760;
const CHART_HEIGHT = 300;
const MARGIN = { top: 20, right: 22, bottom: 58, left: 66 };
const PLOT_WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

const emptyEntry = (): UsageEntry => ({
  requests: 0,
  inputTokens: 0,
  outputTokens: 0,
  estimatedCost: 0,
});

function dayDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
}

function tokens(entry: UsageEntry): number {
  return entry.inputTokens + entry.outputTokens;
}

function emptyUsageDay(date: string): UsageDay {
  return { date, chat: emptyEntry(), embedding: emptyEntry() };
}

/** 将不活跃日期补零，保证 X 轴始终表示连续的自然日。 */
export function buildUsageTimeline(usage: UsageDay[], now = new Date()): UsageDay[] {
  const byDate = new Map(usage.map((day) => [day.date, day]));
  const recordedDates = usage.map((day) => dayDate(day.date).getTime());
  const today = dayDate(toDayKey(now));
  const latestRecorded = recordedDates.length ? new Date(Math.max(...recordedDates)) : today;
  const end = latestRecorded > today ? latestRecorded : today;
  const defaultStart = addDays(end, -(WINDOW_DAYS - 1));
  const earliestRecorded = recordedDates.length ? new Date(Math.min(...recordedDates)) : defaultStart;
  const start = earliestRecorded < defaultStart ? earliestRecorded : defaultStart;
  const result: UsageDay[] = [];

  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    const date = toDayKey(cursor);
    result.push(byDate.get(date) || emptyUsageDay(date));
  }
  return result;
}

function withTotals(day: UsageDay): ChartDay {
  const chatTokens = tokens(day.chat);
  const embeddingTokens = tokens(day.embedding);
  return {
    ...day,
    chatTokens,
    embeddingTokens,
    totalTokens: chatTokens + embeddingTokens,
    requests: day.chat.requests + day.embedding.requests,
    estimatedCost: day.chat.estimatedCost + day.embedding.estimatedCost,
  };
}

function yAxisMax(max: number): number {
  if (max <= 0) return 100;
  const rawStep = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const rounded = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  return rounded * 4;
}

function formatTokenTick(value: number): string {
  if (value >= 10_000) return `${(value / 1000).toFixed(value % 1000 ? 1 : 0)}k`;
  if (value >= 1_000) return `${(value / 1000).toFixed(value % 1000 ? 1 : 0)}k`;
  return value.toLocaleString();
}

function formatDateTick(date: string): string {
  return `${date.slice(5, 7)}/${date.slice(8, 10)}`;
}

type DragState = { pointerId: number; startX: number; windowStart: number };

export function UsageChart({ usage, now }: { usage: UsageDay[]; now?: Date }) {
  const timeline = useMemo(() => buildUsageTimeline(usage, now), [usage, now]);
  const [windowStart, setWindowStart] = useState(Math.max(timeline.length - WINDOW_DAYS, 0));
  const [hovered, setHovered] = useState<ChartDay | null>(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<DragState | null>(null);
  const maxWindowStart = Math.max(timeline.length - WINDOW_DAYS, 0);
  const canPan = maxWindowStart > 0;

  useEffect(() => {
    setWindowStart(maxWindowStart);
    setHovered(null);
  }, [maxWindowStart]);

  const visibleDays = timeline.slice(windowStart, windowStart + WINDOW_DAYS).map(withTotals);
  const axisMax = yAxisMax(Math.max(...visibleDays.map((day) => day.totalTokens), 0));
  const slotWidth = PLOT_WIDTH / Math.max(visibleDays.length, 1);
  const barWidth = Math.max(3, slotWidth * 0.62);
  const xTickStep = Math.max(1, Math.ceil(visibleDays.length / 8));
  const rangeText = visibleDays.length
    ? `${visibleDays[0].date} 至 ${visibleDays[visibleDays.length - 1].date}`
    : "暂无记录";

  function setHoveredAtClientX(clientX: number, svg: SVGSVGElement) {
    const rect = svg.getBoundingClientRect();
    if (!rect.width) return;
    const svgX = ((clientX - rect.left) / rect.width) * CHART_WIDTH;
    const index = Math.floor((svgX - MARGIN.left) / slotWidth);
    setHovered(visibleDays[Math.max(0, Math.min(index, visibleDays.length - 1))] || null);
  }

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (!canPan) {
      setHoveredAtClientX(event.clientX, event.currentTarget);
      return;
    }
    drag.current = { pointerId: event.pointerId, startX: event.clientX, windowStart };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragging(true);
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const activeDrag = drag.current;
    if (activeDrag?.pointerId === event.pointerId) {
      const dayOffset = Math.round((activeDrag.startX - event.clientX) / slotWidth);
      setWindowStart(Math.max(0, Math.min(maxWindowStart, activeDrag.windowStart + dayOffset)));
      return;
    }
    setHoveredAtClientX(event.clientX, event.currentTarget);
  }

  function finishDrag(event: React.PointerEvent<SVGSVGElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    drag.current = null;
    setDragging(false);
  }

  return (
    <section className="usage-chart" aria-label="RAG 用量趋势">
      <div className="usage-chart-head">
        <div>
          <p className="usage-chart-axis-title">Token（每日）</p>
          <p className="usage-chart-range" data-testid="usage-range">查看区间：{rangeText}</p>
        </div>
        <div className="usage-chart-legend" aria-label="图例">
          <span><i className="usage-swatch usage-swatch-chat" />对话</span>
          <span><i className="usage-swatch usage-swatch-embedding" />向量化</span>
        </div>
      </div>
      <svg
        className={"usage-chart-svg" + (canPan ? " is-pannable" : "") + (dragging ? " is-dragging" : "")}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label="RAG 用量趋势图"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onPointerLeave={(event) => {
          if (!drag.current) setHovered(null);
          if (drag.current && event.currentTarget.hasPointerCapture?.(event.pointerId) === false) finishDrag(event);
        }}
      >
        {[0, 1, 2, 3, 4].map((index) => {
          const value = (axisMax / 4) * index;
          const y = MARGIN.top + PLOT_HEIGHT - (value / axisMax) * PLOT_HEIGHT;
          return (
            <g key={value}>
              <line x1={MARGIN.left} y1={y} x2={CHART_WIDTH - MARGIN.right} y2={y} className="usage-grid-line" />
              <text x={MARGIN.left - 10} y={y + 4} textAnchor="end" className="usage-axis-label">{formatTokenTick(value)}</text>
            </g>
          );
        })}
        <line x1={MARGIN.left} y1={MARGIN.top} x2={MARGIN.left} y2={MARGIN.top + PLOT_HEIGHT} className="usage-axis-line" />
        <line x1={MARGIN.left} y1={MARGIN.top + PLOT_HEIGHT} x2={CHART_WIDTH - MARGIN.right} y2={MARGIN.top + PLOT_HEIGHT} className="usage-axis-line" />
        {visibleDays.map((day, index) => {
          const x = MARGIN.left + index * slotWidth + (slotWidth - barWidth) / 2;
          const embeddingHeight = (day.embeddingTokens / axisMax) * PLOT_HEIGHT;
          const chatHeight = (day.chatTokens / axisMax) * PLOT_HEIGHT;
          const baseY = MARGIN.top + PLOT_HEIGHT;
          const isHovered = hovered?.date === day.date;
          return (
            <g key={day.date} className={isHovered ? "usage-bar is-hovered" : "usage-bar"}>
              <rect x={x} y={baseY - embeddingHeight} width={barWidth} height={embeddingHeight} className="usage-bar-embedding" />
              <rect x={x} y={baseY - embeddingHeight - chatHeight} width={barWidth} height={chatHeight} className="usage-bar-chat" />
              <title>{`${day.date}\n对话 ${day.chatTokens.toLocaleString()} Token\n向量化 ${day.embeddingTokens.toLocaleString()} Token\n请求 ${day.requests} · ¥${day.estimatedCost.toFixed(4)}`}</title>
              {(index % xTickStep === 0 || index === visibleDays.length - 1) && (
                <text x={x + barWidth / 2} y={MARGIN.top + PLOT_HEIGHT + 22} textAnchor="middle" className="usage-axis-label">{formatDateTick(day.date)}</text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="usage-chart-controls">
        <button type="button" className="theme-btn" disabled={windowStart === 0} onClick={() => setWindowStart((value) => Math.max(0, value - WINDOW_DAYS))}>查看更早记录</button>
        <button type="button" className="theme-btn" disabled={windowStart === maxWindowStart} onClick={() => setWindowStart((value) => Math.min(maxWindowStart, value + WINDOW_DAYS))}>查看较新记录</button>
        <span>{canPan ? "在图表中左右拖拽，也可切换时间区间。" : "当前没有更早的历史用量可供拖拽查看。继续使用后可回看历史区间。"}</span>
      </div>
      <p className="usage-chart-detail" aria-live="polite">
        {hovered
          ? `${hovered.date}：对话 ${hovered.chatTokens.toLocaleString()} Token，向量化 ${hovered.embeddingTokens.toLocaleString()} Token；${hovered.requests} 次请求，估算 ¥${hovered.estimatedCost.toFixed(4)}`
          : "悬停柱形可查看每日明细。"}
      </p>
    </section>
  );
}
