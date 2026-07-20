# 个人求职站 · Personal Site (Next.js 全栈)

一个面向求职的单页个人站：展示个人信息、可预览简历 PDF、可查看 RAG 语料清单、带记忆窗口的 AI 问答（严格基于你的文档）、访客留言板（邮件 + 后台查看）。

## 技术栈

- **Next.js 14 (App Router) + TypeScript** — 前后端一体
- **纯 CSS**（无 UI 框架，极简商务风格，含明暗主题、响应式、滚动微交互）
- **通义千问 DashScope**（OpenAI 兼容）— RAG 的 embedding + 对话，未配 Key 时自动降级
- **Resend** — 留言邮件通知，未配 Key 时打印控制台
- **本地文件存储**（开发期）/ **腾讯云 COS**（生产持久化）；Postgres + pgvector 是后续扩展选项

## 目录结构

```
personal-site/
├─ app/
│  ├─ layout.tsx            # 全局布局、主题初始化、字体
│  ├─ page.tsx              # 单页（侧边栏 + 首页/个人信息/AI/留言）
│  ├─ admin/page.tsx        # 后台：登录 / 上传语料 / 查看留言
│  ├─ globals.css           # 全部样式（明暗主题、四区块、弹窗）
│  └─ api/
│     ├─ chat/route.ts      # RAG 对话（历史记忆 + 引用来源）
│     ├─ corpus/route.ts    # 语料清单（仅标题+简介，供前端下拉）
│     ├─ messages/route.ts  # 访客留言（校验 + 邮件通知）
│     └─ admin/
│        ├─ login/route.ts      # 登录下发 httpOnly cookie
│        ├─ logout/route.ts
│        ├─ docs/route.ts       # 上传语料（鉴权）
│        └─ messages/route.ts   # 查看留言（鉴权）
├─ components/              # Hero / About / AiAssistant / MessageBoard / Sidebar / Reveal
├─ lib/                     # llm(通义) / rag / email / auth / store
├─ data/
│  ├─ corpus.json           # 语料种子（标题+简介+分块），随仓库提交
│  └─ objects/rag/index.json # 运行时生成：持久化文档、分块与向量（已 gitignore；配置 COS 后存入桶）
└─ .env.example             # 全部环境变量模板
```

## 本地开发

```bash
npm install
cp .env.example .env.local   # 可选；不填也能跑（走降级模式）
npm run dev                  # http://localhost:3000
```

不配置任何 Key 时：聊天走本地关键词检索 + 原文摘录（带引用来源），留言打到控制台，
后台登录用 `.env.example` 里的默认账号（`admin` / `change_me_strong_password`）。

## 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| `QWEN_API_KEY` | 通义千问 DashScope API Key（[申请](https://dashscope.console.aliyun.com/)）。**填了才启用真实 RAG**，否则降级演示 | 推荐 |
| `QWEN_CHAT_MODEL` | 默认 `qwen-plus`，可选 `qwen-turbo` / `qwen-max` | 否 |
| `QWEN_EMBED_MODEL` | 默认 `text-embedding-v3` | 否 |
| `RESEND_API_KEY` | Resend API Key（[申请](https://resend.com/)），用于留言邮件通知 | 推荐 |
| `ADMIN_EMAIL` | 收留言的邮箱 | 配 Resend 时必填 |
| `MAIL_FROM` | 发件人，默认 `onerr@resend.dev` | 否 |
| `ADMIN_USER` / `ADMIN_PASS` | 后台登录账号密码，**生产务必修改** | 是 |
| `AUTH_SECRET` | 登录 token 签名密钥，生产改随机长串 | 是 |
| `COS_ENDPOINT` / `COS_REGION` / `COS_BUCKET` | 腾讯云 COS 的接口、地域与桶名 | 生产推荐 |
| `COS_SECRET_ID` / `COS_SECRET_KEY` | 仅有该私有桶读写权限的 CAM 子账号密钥 | 配 COS 时必填 |

## 部署到 Vercel（对外开放）

1. 把 `personal-site/` 推到 GitHub（或 `npx vercel` 直接部署）。
2. 在 Vercel 项目 **Settings → Environment Variables** 填入上述变量
   （至少 `ADMIN_USER` / `ADMIN_PASS` / `AUTH_SECRET`；生产必须加 COS 的五项变量，推荐再加 `QWEN_API_KEY` 与 `RESEND_API_KEY`）。
3. 部署后访问首页即可；后台在 `/admin`。

> **Serverless 文件系统只读提醒**：Vercel 等平台运行时文件不可作为持久化存储。
> - 配置 COS 后，简历、留言、访客记录以及 RAG 的 `rag/index.json` 都会写入私有桶；后台新增语料在重启/重新部署后仍可用。
> - RAG 索引含文档分块与 embedding。首次真实检索会为缺少的向量补齐 embedding 并保存；更换 embedding 模型后会自动重新向量化。
> - 未配置 COS 时，生产环境只适合读取随构建包含的种子语料；不要在该模式使用后台上传、简历上传或留言持久化。

## 后台使用

1. 访问 `/admin`，用 `ADMIN_USER` / `ADMIN_PASS` 登录。
2. **上传 RAG 语料**：粘贴文档内容（空行分段）。文档与分块会保存到 `rag/index.json`；
   配 `QWEN_API_KEY` 时自动向量化，未配 Key 时先保存文档并走关键词降级。
3. **查看留言**：登录后可看到所有访客留言。

## RAG 严格性

`lib/rag.ts` 的 system prompt 强制要求：严格基于资料、不得编造；资料外问题明确说
"这方面资料里没有提到"；回答末尾标注引用来源。配 Key 后即为真实 RAG，幻觉风险低。

## 已知 TODO（生产增强）

- [ ] 语料量或并发增长后，迁移到 TencentDB for PostgreSQL + pgvector，改为数据库侧向量检索。
- [ ] 可选：访客匿名统计（看哪些地区/公司在浏览，助力求职）。

## 设计稿

前端视觉基于 `design-previews/style-a-refined.html`（极简商务 · 左侧固定侧边栏 + 右侧滚动内容）。
