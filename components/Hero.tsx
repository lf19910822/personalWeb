"use client";
import { useEffect, useRef, useState } from "react";

export default function Hero() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      closeRef.current?.focus();
    } else {
      document.body.style.overflow = "";
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section id="hero" className="reveal">
      <div className="eyebrow">Personal Profile</div>
      <h1>张明</h1>
      <p className="lead">
        高级前端工程师,8 年经验。专注于把复杂 B 端系统打磨成顺滑、可信赖的体验,带过 6 人前端团队。
      </p>
      <div className="hero-cta">
        <button className="btn-resume" type="button" onClick={() => setOpen(true)}>
          📄 查看个人简历 PDF
        </button>
        <a className="btn-ghost" href="#ai">
          向 AI 提问 →
        </a>
      </div>
      <div className="stats">
        <div className="stat">
          <div className="eyebrow">经验</div>
          <div className="n">8 年</div>
        </div>
        <div className="stat">
          <div className="eyebrow">主导项目</div>
          <div className="n">12+</div>
        </div>
        <div className="stat">
          <div className="eyebrow">技术栈</div>
          <div className="n" style={{ fontSize: 18, marginTop: 10 }}>
            React · TS · Node
          </div>
        </div>
      </div>
      <div className="scrollhint">
        <span className="arrow">↓</span> 向下滚动,了解更多信息
      </div>

      {open && (
        <div className="pdf-modal" role="dialog" aria-modal="true" aria-label="个人简历 PDF">
          <div className="pdf-backdrop" onClick={() => setOpen(false)} />
          <div className="pdf-panel">
            <div className="pdf-bar">
              <span>个人简历 · 张明.pdf</span>
              <div className="pdf-actions">
                <a
                  className="pdf-dl"
                  href="/api/resume"
                  target="_blank"
                  rel="noopener"
                  download
                >
                  下载
                </a>
                <button
                  className="pdf-x"
                  ref={closeRef}
                  onClick={() => setOpen(false)}
                  aria-label="关闭"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="pdf-body">
              <object data="/api/resume" type="application/pdf" className="pdf-frame">
                <div className="pdf-fallback">
                  <p>简历 PDF 尚未上传。</p>
                  <p>
                    进入后台「简历」标签页,上传你的 <code>resume.pdf</code> 即可在此预览与下载。
                  </p>
                </div>
              </object>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
