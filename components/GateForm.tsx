"use client";
import { useState } from "react";

export default function GateForm({ from }: { from: string }) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErr("请填写你的称呼,方便我了解是谁在访问");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/visitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), company: company.trim() }),
      });
      if (res.ok) {
        window.location.href = from.startsWith("/") ? from : "/";
        return;
      }
      setErr("提交失败,请重试");
    } catch {
      setErr("网络异常,请重试");
    }
    setLoading(false);
  }

  return (
    <div className="gate">
      <form className="gate-card" onSubmit={submit}>
        <div className="gate-eyebrow">Welcome · 身份确认</div>
        <h1 className="gate-title">先认识一下你 👋</h1>
        <p className="gate-sub">
          为了知道是谁在浏览我的简历、方便后续沟通,麻烦填写一下。信息仅用于访客统计,不会对外公开。
        </p>
        <div className="field">
          <label htmlFor="g-name">你的称呼 *</label>
          <input
            id="g-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="如:李经理 / 王同学"
            autoFocus
          />
        </div>
        <div className="field">
          <label htmlFor="g-company">所在公司(选填)</label>
          <input
            id="g-company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="如:某某科技 / 某高校"
          />
        </div>
        <button className="btn gate-btn" type="submit" disabled={loading}>
          {loading ? "提交中…" : "进入站点 →"}
        </button>
        {err && <div className="err">{err}</div>}
        <p className="gate-note">提交即表示你同意我记录上述匿名访客信息。</p>
      </form>
    </div>
  );
}
