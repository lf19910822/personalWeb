const PROJECT_SCROLL_DURATION_MS = 500;
const PROJECT_SCROLL_TOP_OFFSET_MIN_PX = 96;
const PROJECT_SCROLL_TOP_OFFSET_MAX_PX = 200;
let activePageScroll: (() => void) | undefined;

function easeInOutCubic(progress: number): number {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - ((-2 * progress + 2) ** 3) / 2;
}

export function getScrollTopOffset(viewportHeight: number): number {
  return Math.min(
    PROJECT_SCROLL_TOP_OFFSET_MAX_PX,
    Math.max(PROJECT_SCROLL_TOP_OFFSET_MIN_PX, Math.round(viewportHeight * 0.4))
  );
}

/**
 * 在固定时间内把元素顶部移动到视口安全边距。返回的函数可取消尚未完成的滚动。
 */
export function scrollToElement(
  target: HTMLElement,
  { durationMs = PROJECT_SCROLL_DURATION_MS, targetTopAdjustment = 0 }: { durationMs?: number; targetTopAdjustment?: number } = {}
): () => void {
  const startTop = window.scrollY;
  const bounds = target.getBoundingClientRect();
  const idealTop = startTop + bounds.top + targetTopAdjustment - getScrollTopOffset(window.innerHeight);
  const maxTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const endTop = Math.min(Math.max(idealTop, 0), maxTop);
  if (durationMs <= 0) {
    window.scrollTo({ top: endTop, behavior: "auto" });
    return () => {};
  }
  let frameId: number | undefined;
  let startedAt: number | undefined;
  let cancelled = false;
  let inputLocked = true;
  const preventWheel = (event: WheelEvent) => event.preventDefault();
  const unlockInput = () => {
    if (!inputLocked) return;
    inputLocked = false;
    window.removeEventListener("wheel", preventWheel);
  };

  window.addEventListener("wheel", preventWheel, { passive: false });

  const step = (timestamp: number) => {
    if (cancelled) return;
    startedAt ??= timestamp;
    const progress = Math.min((timestamp - startedAt) / durationMs, 1);
    const top = startTop + (endTop - startTop) * easeInOutCubic(progress);
    window.scrollTo({ top, behavior: "auto" });
    if (progress < 1) {
      frameId = window.requestAnimationFrame(step);
    } else {
      unlockInput();
    }
  };

  frameId = window.requestAnimationFrame(step);
  return () => {
    cancelled = true;
    if (frameId !== undefined) window.cancelAnimationFrame(frameId);
    unlockInput();
  };
}

/** 站内跳转的统一入口：取消前一次跳转并播放统一动画。 */
export function scrollToPageElement(
  target: HTMLElement,
  { targetTopAdjustment = 0 }: { targetTopAdjustment?: number } = {}
): () => void {
  activePageScroll?.();
  const cancel = scrollToElement(target, {
    targetTopAdjustment,
  });
  const stop = () => {
    cancel();
    if (activePageScroll === stop) activePageScroll = undefined;
  };
  activePageScroll = stop;
  return stop;
}

export { PROJECT_SCROLL_DURATION_MS };
