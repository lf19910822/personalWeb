const PROJECT_SCROLL_DURATION_MS = 500;

function easeInOutCubic(progress: number): number {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - ((-2 * progress + 2) ** 3) / 2;
}

/**
 * 在固定时间内把视口移动到元素中心。返回的函数可取消尚未完成的滚动。
 */
export function scrollToElement(target: HTMLElement, durationMs = PROJECT_SCROLL_DURATION_MS): () => void {
  const startTop = window.scrollY;
  const bounds = target.getBoundingClientRect();
  const idealTop = startTop + bounds.top - (window.innerHeight - bounds.height) / 2;
  const maxTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const endTop = Math.min(Math.max(idealTop, 0), maxTop);
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

export { PROJECT_SCROLL_DURATION_MS };
