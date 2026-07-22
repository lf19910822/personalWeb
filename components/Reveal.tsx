"use client";
import { useEffect } from "react";

/** 滚动进入视口时给 .reveal 元素加 .in,触发淡入 */
export default function Reveal() {
  useEffect(() => {
    const observed = new WeakSet<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    const observeReveals = () => {
      document.querySelectorAll(".reveal").forEach((el) => {
        if (observed.has(el)) return;
        observed.add(el);
        io.observe(el);
      });
    };
    observeReveals();

    const mutations = new MutationObserver(observeReveals);
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutations.disconnect();
      io.disconnect();
    };
  }, []);
  return null;
}
