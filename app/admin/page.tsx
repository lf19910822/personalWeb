"use client";
import { useEffect, useState } from "react";

type Message = {
  id: string;
  name: string;
  email: string;
  text: string;
  createdAt: string;
};

export default function Admin() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [loginErr, setLoginErr] = useState("");

  const [title, setTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [content, setContent] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (loggedIn) loadMessages();
  }, [loggedIn]);

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginErr("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, pass }),
    });
    if (!res.ok) {
      setLoginErr("账号或密码错误");
      return;
    }
    setLoggedIn(true);
  }

  async function loadMessages() {
    const res = await fetch("/api/admin/messages", { credentials: "include" });
    if (res.ok) {
      const d = await res.json();
      setMessages(d.messages || []);
    }
  }

  async function doUpload(e: React.FormEvent) {
    e.preventDefault();
    setUploadMsg("");
    const res = await fetch("/api/admin/docs", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, intro, content }),
    });
    const d = await res.json();
    if (res.ok) {
      setUploadMsg("✓ 已添加语料:" + title);
      setTitle("");
      setIntro("");
      setContent("");
    } else {
      setUploadMsg("✗ " + (d.error || "添加失败"));
    }
  }

  async function doLogout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    setLoggedIn(false);
    setUser("");
    setPass("");
  }

  if (!loggedIn) {
    return (
      <div className="admin">
        <h1>后台登录</h1>
        <p className="lead">管理 RAG 语料与查看访客留言。</p>
        <form className="card" onSubmit={doLogin}>
          <div className="field">
            <label htmlFor="a-user">账号</label>
            <input
              id="a-user"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="ADMIN_USER"
            />
          </div>
          <div className="field">
            <label htmlFor="a-pass">密码</label>
            <input
              id="a-pass"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="ADMIN_PASS"
            />
          </div>
          <button className="btn" type="submit">
            登录
          </button>
          {loginErr && <div className="err">{loginErr}</div>}
        </form>
        <p className="lock" style={{ marginTop: 16 }}>
          账号密码在环境变量的 ADMIN_USER / ADMIN_PASS 中配置。
        </p>
      </div>
    );
  }

  return (
    <div className="admin">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>管理后台</h1>
        <button className="theme-btn" onClick={doLogout}>
          退出登录
        </button>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 20 }}>上传 RAG 语料</h2>
        <p className="lead" style={{ fontSize: 15 }}>
          粘贴文档内容(用空行分段),会作为 AI 回答的知识边界。配置 QWEN_API_KEY 后自动向量化。
        </p>
        <form onSubmit={doUpload}>
          <div className="field">
            <label htmlFor="d-title">文档标题</label>
            <input
              id="d-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="如:A 项目复盘"
            />
          </div>
          <div className="field">
            <label htmlFor="d-intro">一句话简介(展示用)</label>
            <input
              id="d-intro"
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              placeholder="如:A 项目的难点与方案"
            />
          </div>
          <div className="field">
            <label htmlFor="d-content">文档内容(空行分段)</label>
            <textarea
              id="d-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={"第一段…\n\n第二段…"}
            />
          </div>
          <button className="btn" type="submit">
            添加到语料库
          </button>
          {uploadMsg && (
            <div className={uploadMsg.startsWith("✓") ? "ok" : "err"}>{uploadMsg}</div>
          )}
        </form>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 20 }}>访客留言</h2>
        {messages.length === 0 && <p className="lead" style={{ fontSize: 15 }}>暂无留言。</p>}
        {messages.map((m) => (
          <div className="m-item" key={m.id}>
            <div className="m-meta">
              {m.name} · {m.email} · {new Date(m.createdAt).toLocaleString("zh-CN")}
            </div>
            <div>{m.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
