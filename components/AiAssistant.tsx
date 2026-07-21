"use client";
import { useEffect, useRef, useState } from "react";
import MarkdownAnswer from "./MarkdownAnswer";

type Msg = { role: "user" | "ai"; content: string; sources?: string[] };
type DocMeta = { id: string; title: string; intro: string };
type ModelStatus = { displayName: string };
const TYPEWRITER_INTERVAL_MS = 18;

/** 按用户可见字符拆分，避免把 emoji 或组合字符拆成多个打字步骤。 */
export function splitTypingUnits(text: string): string[] {
  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter("zh-CN", { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), ({ segment }) => segment);
  }
  return Array.from(text);
}

function typingDelay(unit: string): number {
  return /[。！？!?；;：:]/u.test(unit) ? 72 : TYPEWRITER_INTERVAL_MS;
}

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
  const [model, setModel] = useState<ModelStatus | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldFollowLatestRef = useRef(true);

  useEffect(() => {
    fetch("/api/corpus")
      .then((r) => r.json())
      .then((d) => {
        setDocs(d.docs || []);
        setModel(d.model || null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fillProjectQuestion = (event: Event) => {
      const question = (event as CustomEvent<string>).detail;
      if (typeof question !== "string" || !question.trim()) return;
      setInput(question);
      window.setTimeout(() => inputRef.current?.focus(), 350);
    };
    window.addEventListener("ask-project-ai", fillProjectQuestion);
    return () => window.removeEventListener("ask-project-ai", fillProjectQuestion);
  }, []);

  useEffect(() => {
    if (logRef.current && shouldFollowLatestRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages, loading]);

  function updateFollowLatest() {
    const log = logRef.current;
    if (!log) return;
    shouldFollowLatestRef.current = log.scrollHeight - log.scrollTop - log.clientHeight < 24;
  }

  async function send() {
    const q = input.trim();
    if (!q || loading) return;
    // 只保留最近两轮(4 条消息),用于理解追问中的指代；每次提问仍会重新检索语料。
    const history = messages.slice(-4).map((m) => ({
      role: m.role === "ai" ? "assistant" : "user",
      content: m.content,
    }));
    const next = [...messages, { role: "user" as const, content: q }];
    shouldFollowLatestRef.current = true;
    setMessages([...next, { role: "ai", content: "" }]);
    setInput("");
    setLoading(true);
    let cancelTyping = () => {};
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "生成回答失败");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const updateAnswer = (update: Partial<Msg>, append = false) => {
        setMessages((current) => {
          const last = current[current.length - 1];
          if (!last || last.role !== "ai") return current;
          return [
            ...current.slice(0, -1),
            { ...last, ...update, content: append ? last.content + (update.content || "") : update.content ?? last.content },
          ];
        });
      };
      const typeQueue: string[] = [];
      let typingTimer: number | undefined;
      let streamFinished = false;
      let typingCancelled = false;
      cancelTyping = () => {
        typingCancelled = true;
        if (typingTimer) window.clearTimeout(typingTimer);
      };
      let resolveTypingDrained: () => void = () => {};
      const typingDrained = new Promise<void>((resolve) => {
        resolveTypingDrained = resolve;
      });
      const finishTypingIfDrained = () => {
        if (streamFinished && !typingTimer && typeQueue.length === 0) resolveTypingDrained();
      };
      const writeNextUnit = () => {
        if (typingCancelled) return;
        const unit = typeQueue.shift();
        if (!unit) {
          typingTimer = undefined;
          finishTypingIfDrained();
          return;
        }
        updateAnswer({ content: unit }, true);
        typingTimer = window.setTimeout(writeNextUnit, typingDelay(unit));
      };
      const enqueueTyping = (text: string) => {
        typeQueue.push(...splitTypingUnits(text));
        if (!typingTimer) writeNextUnit();
      };
      const consumeEvents = () => {
        buffer = buffer.replace(/\r\n/g, "\n");
        while (true) {
          const boundary = buffer.indexOf("\n\n");
          if (boundary < 0) return;
          const rawEvent = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const event = rawEvent.match(/^event: (.+)$/m)?.[1] || "message";
          const data = rawEvent
            .split("\n")
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trimStart())
            .join("\n");
          if (!data) continue;
          const payload = JSON.parse(data);
          if (event === "sources") updateAnswer({ sources: payload.sources || [] });
          if (event === "delta") enqueueTyping(payload.text || "");
          if (event === "error") throw new Error(payload.error || "生成回答失败");
        }
      };
      while (true) {
        const { done, value } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          consumeEvents();
        }
        if (done) break;
      }
      buffer += decoder.decode();
      consumeEvents();
      streamFinished = true;
      finishTypingIfDrained();
      await typingDrained;
    } catch (e: any) {
      cancelTyping();
      setMessages((current) => [
        ...current.slice(0, -1),
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
        <div className="chat-log" ref={logRef} onScroll={updateFollowLatest}>
          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role === "user" ? "b-user" : "b-ai"}`}>
              {m.role === "ai" ? (
                <>
                  {m.content ? <MarkdownAnswer content={m.content} /> : <span className="streaming-status">正在检索资料并生成回答…</span>}
                  {loading && i === messages.length - 1 && m.content && <span className="streaming-cursor" aria-hidden="true" />}
                </>
              ) : m.content}
              {m.sources && m.sources.length > 0 && (
                <div className="cite">📎 引用:{m.sources.join("、")}</div>
              )}
            </div>
          ))}
        </div>
        <div className="chat-input">
          <input
            ref={inputRef}
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
      <p className="memhint">🤖 当前回答模型：{model?.displayName || "正在读取模型状态…"}</p>

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
