"use client";
import { useEffect, useState } from "react";

type Message = {
  id: string;
  name: string;
  email: string;
  text: string;
  createdAt: string;
};
type Visitor = {
  id: string;
  name: string;
  company: string;
  ip: string;
  browser: string;
  os: string;
  device: string;
  referer: string;
  country: string;
  city: string;
  isBot: boolean;
  createdAt: string;
};
type Status = {
  llm: boolean;
  mail: boolean;
  storage: string;
  docCount: number;
  messageCount: number;
  visitorCount: number;
};

const TABS = [
  { id: "overview", label: "概览" },
  { id: "docs", label: "语料" },
  { id: "resume", label: "简历" },
  { id: "messages", label: "留言" },
  { id: "visitors", label: "访客" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function Admin() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [loginErr, setLoginErr] = useState("");

  const [tab, setTab] = useState<TabId>("overview");
  const [status, setStatus] = useState<Status | null>(null);

  // 语料
  const [title, setTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [content, setContent] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");

  // 简历
  const [resumeExists, setResumeExists] = useState(false);
  const [resumeMsg, setResumeMsg] = useState("");

  // 留言 / 访客
  const [messages, setMessages] = useState<Message[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);

  useEffect(() => {
    if (loggedIn) {
      loadStatus();
      loadMessages();
    }
  }, [loggedIn]);

  useEffect(() => {
    if (loggedIn && tab === "visitors") loadVisitors();
    if (loggedIn && tab === "resume") loadResumeStatus();
  }, [tab, loggedIn]);

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

  async function loadStatus() {
    const res = await fetch("/api/admin/status", { credentials: "include" });
    if (res.ok) setStatus(await res.json());
  }
  async function loadMessages() {
    const res = await fetch("/api/admin/messages", { credentials: "include" });
    if (res.ok) setMessages((await res.json()).messages || []);
  }
  async function loadVisitors() {
    const res = await fetch("/api/admin/visitors", { credentials: "include" });
    if (res.ok) setVisitors((await res.json()).visitors || []);
  }
  async function loadResumeStatus() {
    const res = await fetch("/api/admin/resume", { credentials: "include" });
    if (res.ok) setResumeExists((await res.json()).exists);
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
      setUploadMsg("✓ 已加入内存语料库:" + title);
      setTitle("");
      setIntro("");
      setContent("");
      loadStatus();
    } else {
      setUploadMsg("✗ " + (d.error || "添加失败"));
    }
  }

  async function doResume(e: React.FormEvent) {
    e.preventDefault();
    setResumeMsg("");
    const input = (e.target as HTMLFormElement).querySelector(
      "input[type=file]"
    ) as HTMLInputElement;
    if (!input.files?.length) {
      setResumeMsg("✗ 请选择 PDF 文件");
      return;
    }
    const fd = new FormData();
    fd.append("file", input.files[0]);
    const res = await fetch("/api/admin/resume", {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const d = await res.json();
    if (res.ok) {
      setResumeMsg("✓ 简历已上传(" + Math.round(d.size / 1024) + " KB)");
      setResumeExists(true);
    } else {
      setResumeMsg("✗ " + (d.error || "上传失败"));
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
        <p className="lead">管理 RAG 语料、简历、查看访客留言与访客。</p>
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

      {status && (
        <div className="status-strip">
          <Stat label="AI/RAG" on={status.llm} text={status.llm ? "已接通" : "降级模式"} />
          <Stat label="邮件通知" on={status.mail} text={status.mail ? "已接通" : "控制台"} />
          <Stat label="存储" on={status.storage === "cos"} text={status.storage === "cos" ? "腾讯云 COS" : "本地文件"} />
          <div className="stat-pill">
            语料 {status.docCount} · 留言 {status.messageCount} · 访客 {status.visitorCount}
          </div>
        </div>
      )}

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={"tab" + (tab === t.id ? " active" : "")}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="card">
          <h2 style={{ fontSize: 20 }}>站点状态</h2>
          <p className="lead" style={{ fontSize: 15 }}>
            下方为当前运行状态。AI/RAG 与邮件需配置对应 API Key 才会启用真实能力;
            存储为腾讯云 COS 时访客与简历持久化,否则仅本地文件(重启清空)。
          </p>
        </div>
      )}

      {tab === "docs" && (
        <div className="card">
          <h2 style={{ fontSize: 20 }}>上传 RAG 语料(内存态)</h2>
          <p className="lead" style={{ fontSize: 15 }}>
            粘贴文档内容(空行分段),自动切分并(配 QWEN_API_KEY 时)向量化,加入内存语料库。
            注意:内存态,服务器重启会回退到种子语料。
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
      )}

      {tab === "resume" && (
        <div className="card">
          <h2 style={{ fontSize: 20 }}>简历 PDF</h2>
          <p className="lead" style={{ fontSize: 15 }}>
            上传后,首页「查看个人简历 PDF」按钮即可预览与下载。文件存于
            {status?.storage === "cos" ? "腾讯云 COS" : "本地存储"}。
          </p>
          <p className={resumeExists ? "ok" : "lock"}>
            {resumeExists ? "✓ 当前已上传简历" : "○ 尚未上传简历"}
          </p>
          <form onSubmit={doResume}>
            <div className="field">
              <label htmlFor="r-file">选择 PDF(≤10MB)</label>
              <input id="r-file" type="file" accept="application/pdf" />
            </div>
            <button className="btn" type="submit">
              上传简历
            </button>
            {resumeMsg && (
              <div className={resumeMsg.startsWith("✓") ? "ok" : "err"}>{resumeMsg}</div>
            )}
          </form>
        </div>
      )}

      {tab === "messages" && (
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
      )}

      {tab === "visitors" && (
        <div className="card">
          <h2 style={{ fontSize: 20 }}>访客记录({visitors.length})</h2>
          {visitors.length === 0 && (
            <p className="lead" style={{ fontSize: 15 }}>暂无访客记录。</p>
          )}
          {visitors.map((v) => (
            <div className="v-item" key={v.id}>
              <div className="v-head">
                <span className="v-name">{v.name}</span>
                {v.company && <span className="v-company">· {v.company}</span>}
                {v.isBot && <span className="v-bot">爬虫</span>}
                <span className="v-time">{new Date(v.createdAt).toLocaleString("zh-CN")}</span>
              </div>
              <div className="v-meta">
                {v.browser} / {v.os} / {v.device}
                {v.country && ` · ${v.country}${v.city ? " " + v.city : ""}`} · {v.ip}
              </div>
              {v.referer && <div className="v-ref">来源:{v.referer}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, on, text }: { label: string; on: boolean; text: string }) {
  return (
    <div className="stat-pill">
      <span className={"dot" + (on ? " on" : "")} />
      {label}:{text}
    </div>
  );
}
