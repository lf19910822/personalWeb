"use client";
import { useEffect, useState } from "react";

const NAV = [
  { id: "hero", idx: "01", label: "首页" },
  { id: "about", idx: "02", label: "个人信息" },
  { id: "projects", idx: "03", label: "项目案例" },
  { id: "ai", idx: "04", label: "AI 助手" },
  { id: "msg", idx: "05", label: "留言" },
];

export default function Sidebar() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [active, setActive] = useState("hero");

  useEffect(() => {
    const t = document.documentElement.getAttribute("data-theme") as "light" | "dark" | null;
    setTheme(t || "light");
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    document.querySelectorAll("section").forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
  }

  return (
    <aside className="sidebar">
      <div className="monogram">张</div>
      <div>
        <div className="s-name">张明</div>
        <div className="s-role">高级前端工程师</div>
      </div>
      <div className="badge">
        <span className="dot"></span> 看机会中 · 上海/远程
      </div>
      <nav className="s-nav" aria-label="主导航">
        {NAV.map((n) => (
          <a
            key={n.id}
            className={`s-link${active === n.id ? " active" : ""}`}
            href={`#${n.id}`}
          >
            <span className="idx">{n.idx}</span> {n.label}
          </a>
        ))}
      </nav>
      <div className="s-foot">
        <div className="s-social">
          <a href="#">GitHub</a>
          <a href="#">邮箱</a>
          <a href="/api/resume" target="_blank" rel="noopener">
            简历
          </a>
        </div>
        <button className="theme-btn" onClick={toggle} aria-label="切换明暗主题">
          {theme === "dark" ? "☀ 浅色" : "🌙 深色"}
        </button>
      </div>
    </aside>
  );
}
