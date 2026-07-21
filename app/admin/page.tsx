"use client";
import { useEffect, useState } from "react";
import { RagPreviewTable, type RagPreview } from "./rag-preview-table";
import { UsageChart, type UsageDay } from "./usage-chart";

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
  model?: { provider: "qwen" | "demo"; displayName: string };
  mail: boolean;
  storage: string;
  docCount: number;
  messageCount: number;
  visitorCount: number;
};
type RagDocument = { id: string; fileName: string; title: string; intro: string; parentCount: number; childCount: number; updatedAt: string };

const TABS = [
  { id: "docs", label: "语料" },
  { id: "ai", label: "AI 配置" },
  { id: "resume", label: "简历" },
  { id: "messages", label: "留言" },
  { id: "visitors", label: "访客" },
] as const;
type TabId = (typeof TABS)[number]["id"];
const MODEL_PROVIDER_OPTIONS = [
  { id: "qwen", label: "通义千问（当前已支持）" },
  { id: "deepseek", label: "DeepSeek（预留）" },
  { id: "other", label: "其他 OpenAI 兼容模型（预留）" },
] as const;

export default function Admin() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [loginErr, setLoginErr] = useState("");

  const [tab, setTab] = useState<TabId>("docs");
  const [status, setStatus] = useState<Status | null>(null);
  const [selectedModelProvider, setSelectedModelProvider] = useState<(typeof MODEL_PROVIDER_OPTIONS)[number]["id"]>("qwen");

  // 语料
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<RagPreview[]>([]);
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [usage, setUsage] = useState<UsageDay[]>([]);
  const [uploadMsg, setUploadMsg] = useState("");

  // 简历
  const [resumeExists, setResumeExists] = useState(false);
  const [resumeMsg, setResumeMsg] = useState("");

  // 留言 / 访客
  const [messages, setMessages] = useState<Message[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/status", { credentials: "include" })
      .then(async (res) => {
        if (res.ok && active) {
          setStatus(await res.json());
          setLoggedIn(true);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setAuthChecked(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loggedIn) {
      loadStatus();
      loadMessages();
      loadDocuments();
      loadUsage();
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
  async function loadDocuments() {
    const res = await fetch("/api/admin/docs", { credentials: "include" });
    if (res.ok) setDocuments((await res.json()).documents || []);
  }
  async function loadUsage() {
    const res = await fetch("/api/admin/usage", { credentials: "include" });
    if (res.ok) setUsage((await res.json()).days || []);
  }

  async function doUpload(e: React.FormEvent) {
    e.preventDefault();
    setUploadMsg("");
    if (!files.length) return setUploadMsg("✗ 请选择 Markdown 文件");
    const fd = new FormData();
    fd.append("action", preview.length ? "import" : "preview");
    files.forEach((file) => fd.append("files", file));
    const res = await fetch("/api/admin/docs", {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const d = await res.json();
    if (res.ok) {
      if (!preview.length) {
        setPreview(d.documents || []);
        setUploadMsg("✓ 预检完成，请确认后再次点击导入");
      } else {
        setUploadMsg("✓ 导入完成：" + (d.results || []).filter((r: any) => r.ok).length + " 份成功");
        setFiles([]); setPreview([]); loadDocuments(); loadStatus(); loadUsage();
      }
    } else {
      setPreview([]); setUploadMsg("✗ " + (d.error || "预检失败"));
    }
  }

  async function deleteDocument(id: string) {
    if (!window.confirm("永久删除这份语料及其向量？")) return;
    const res = await fetch(`/api/admin/docs?id=${encodeURIComponent(id)}`, { method: "DELETE", credentials: "include" });
    if (res.ok) { await loadDocuments(); await loadStatus(); }
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

  if (!authChecked) {
    return <div className="admin"><p className="lead">正在恢复登录状态…</p></div>;
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
          <div className="stat-pill">模型:{status.model?.displayName || "正在读取"}</div>
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

      {tab === "docs" && (
        <div className="card">
          <h2 style={{ fontSize: 20 }}>上传 RAG Markdown 文档</h2>
          <p className="lead" style={{ fontSize: 15 }}>
            仅支持 .md；预检后采用父子切分，确认才会向量化并保存到 {status?.storage === "cos" ? "腾讯云 COS" : "本地 data/objects/"}。
          </p>
          <form onSubmit={doUpload}>
            <div className="field">
              <label htmlFor="d-files">选择 Markdown（最多 20 份、单份 ≤256KB、总计 ≤1MB）</label>
              <input
                id="d-files" type="file" accept=".md,text/markdown" multiple
                onChange={(e) => { setFiles(Array.from(e.target.files || [])); setPreview([]); }}
              />
            </div>
            <button className="btn" type="submit">{preview.length ? "确认导入" : "预检文档"}</button>
            {uploadMsg && (
              <div className={uploadMsg.startsWith("✓") ? "ok" : "err"}>{uploadMsg}</div>
            )}
          </form>
          {preview.length > 0 && <RagPreviewTable previews={preview} />}
          <h3 style={{ marginTop: 28 }}>已持久化文档</h3>
          {documents.map((doc) => <div className="m-item" key={doc.id}><div className="m-meta">{doc.fileName} · 父块 {doc.parentCount} · 子块 {doc.childCount}{doc.updatedAt && ` · ${new Date(doc.updatedAt).toLocaleString("zh-CN")}`}</div><div>{doc.title} · {doc.intro}</div><button className="theme-btn" onClick={() => deleteDocument(doc.id)}>永久删除</button></div>)}
        </div>
      )}

      {tab === "ai" && <AiConfigPanel usage={usage} status={status} selectedProvider={selectedModelProvider} onProviderChange={setSelectedModelProvider} />}

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

function AiConfigPanel({
  usage,
  status,
  selectedProvider,
  onProviderChange,
}: {
  usage: UsageDay[];
  status: Status | null;
  selectedProvider: (typeof MODEL_PROVIDER_OPTIONS)[number]["id"];
  onProviderChange: (provider: (typeof MODEL_PROVIDER_OPTIONS)[number]["id"]) => void;
}) {
  const total = usage.reduce(
    (sum, day) => ({
      requests: sum.requests + day.chat.requests + day.embedding.requests,
      tokens: sum.tokens + day.chat.inputTokens + day.chat.outputTokens + day.embedding.inputTokens + day.embedding.outputTokens,
      cost: sum.cost + day.chat.estimatedCost + day.embedding.estimatedCost,
    }),
    { requests: 0, tokens: 0, cost: 0 }
  );
  return (
    <div className="card ai-config-card">
      <div className="ai-config-head">
        <div>
          <h2>AI 配置</h2>
          <p className="lead">查看当前实际模型，并为后续接入更多提供商预设选择。</p>
        </div>
        <span className={status?.llm ? "ai-config-state is-on" : "ai-config-state"}>{status?.llm ? "已接通" : "演示模式"}</span>
      </div>
      <div className="current-model-card">
        <span className="current-model-icon" aria-hidden="true">✦</span>
        <div>
          <span>当前实际模型</span>
          <strong>{status?.model?.displayName || "正在读取"}</strong>
        </div>
        <span className={status?.llm ? "dot on" : "dot"} aria-label={status?.llm ? "模型已接通" : "模型未接通"} />
      </div>
      <div className="field model-provider-field">
        <label htmlFor="model-provider">聊天模型提供商</label>
        <div className="model-select-wrap">
          <select
            id="model-provider"
            className="model-select"
            value={selectedProvider}
            onChange={(event) => onProviderChange(event.target.value as typeof selectedProvider)}
          >
            {MODEL_PROVIDER_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
          <span className="model-select-chevron" aria-hidden="true">⌄</span>
        </div>
      </div>
      <p className="lock model-selection-note">
        此选择暂不修改环境变量或真实调用。{selectedProvider === "qwen" ? "DeepSeek 等提供商接入后可在这里正式切换。" : "所选提供商尚未接入，当前调用不会改变。"}
      </p>

      <div className="ai-config-divider" />
      <h3>AI 用量</h3>
      <p className="lead">实际 Token；费用为按当前配置单价计算的估算值，以百炼账单为准。</p>
      <div className="status-strip"><div className="stat-pill">累计请求 {total.requests}</div><div className="stat-pill">累计 Token {total.tokens.toLocaleString()}</div><div className="stat-pill">累计估算 ¥{total.cost.toFixed(4)}</div></div>
      <UsageChart usage={usage} />
      <p className="lock">仅记录按日 chat / embedding 用量，不保存问题正文、文档正文或访客身份。</p>
    </div>
  );
}
