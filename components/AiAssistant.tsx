"use client";
import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "ai"; content: string; sources?: string[] };
type DocMeta = { id: string; title: string; intro: string };

export default function AiAssistant() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "ai",
      content:
        "你好,我是张明的 AI 助手。关于他的经历、项目或技能,尽管问我——我会严格基于他的资料回答,并标注引用来源。",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/corpus")
      .then((r) => r.json())
      .then((d) => setDocs(d.docs || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, loading]);

  async function send() {
    const q = input.trim();
    if (!q || loading) return;
    // 只保留最近两轮(4 条消息),用于理解追问中的指代；每次提问仍会重新检索语料。
    const history = messages.slice(-4).map((m) => ({
      role: m.role === "ai" ? "assistant" : "user",
      content: m.content,
    }));
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages([
        ...next,
        { role: "ai", content: data.answer, sources: data.sources || [] },
      ]);
    } catch (e: any) {
      setMessages([
        ...next,
        { role: "ai", content: "抱歉,暂时连不上(演示模式或网络问题)。请稍后再试。" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="ai" className="reveal">
      <div className="eyebrow">AI Assistant</div>
      <h2>问问关于我的任何事</h2>
      <p className="lead">基于我的文档回答,答不上来的问题会如实告知,并附上引用来源。</p>
      <div className="chat">
        <div className="chat-log" ref={logRef}>
          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role === "user" ? "b-user" : "b-ai"}`}>
              {m.content}
              {m.sources && m.sources.length > 0 && (
                <div className="cite">📎 引用:{m.sources.join("、")}</div>
              )}
            </div>
          ))}
          {loading && <div className="bubble b-ai">正在检索资料…</div>}
        </div>
        <div className="chat-input">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="输入你的问题,回车发送…"
            aria-label="提问输入框"
          />
          <button className="btn" onClick={send} disabled={loading}>
            发送
          </button>
        </div>
      </div>
      <p className="memhint">🧠 仅保留最近两轮对话，用于理解追问；每次都会重新检索资料。</p>

      <div className="doc-acc">
        <details className="doc-drop">
          <summary>
            <span className="doc-acc-title">RAG Corpus · 仅展示名称</span>
            <span className="doc-count">{docs.length} 项</span>
            <span className="chev">▸</span>
          </summary>
          <div className="doc-list">
            {docs.map((d) => (
              <div className="doc-item" key={d.id}>
                <div className="doc-title">{d.title}</div>
                <div className="doc-intro">{d.intro}</div>
              </div>
            ))}
            <p className="lock">🔒 文档内容不对外提供,仅作为 AI 回答的知识边界。</p>
          </div>
        </details>
      </div>
    </section>
  );
}
