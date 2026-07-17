"use client";
import { useState } from "react";

export default function MessageBoard() {
  const [form, setForm] = useState({ name: "", email: "", text: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提交失败");
      setStatus("ok");
      setMsg("✓ 已收到,我会尽快回复你");
      setForm({ name: "", email: "", text: "" });
    } catch (e: any) {
      setStatus("error");
      setMsg(e.message || "提交失败,请稍后再试");
    }
  }

  return (
    <section id="msg" className="reveal">
      <div className="eyebrow">Contact</div>
      <h2>给张明留言</h2>
      <p className="lead">填写后我会收到邮件通知,并在后台查看。两路都会送达,一般 1 个工作日内回复。</p>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="m-name">你的称呼</label>
          <input
            id="m-name"
            required
            placeholder="怎么称呼你"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="m-email">邮箱</label>
          <input
            id="m-email"
            type="email"
            required
            placeholder="方便我回复你"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="m-text">想说的话</label>
          <textarea
            id="m-text"
            rows={4}
            required
            placeholder="招聘需求、合作意向,或随便聊聊…"
            value={form.text}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
          />
        </div>
        <button className="btn" type="submit" disabled={status === "sending"}>
          {status === "sending" ? "发送中…" : "发送留言"}
        </button>
        {status !== "idle" && <div className={status === "ok" ? "ok" : "err"}>{msg}</div>}
      </form>
    </section>
  );
}
