# 个人求职站 · Personal Site (Next.js 全栈)

一个面向求职的单页个人站：展示个人信息、可预览简历 PDF、可查看 RAG 语料清单、带记忆窗口的 AI 问答（严格基于你的文档）、访客留言板（邮件 + 后台查看）。

## 技术栈

- **Next.js 14 (App Router) + TypeScript** — 前后端一体
- **纯 CSS**（无 UI 框架，极简商务风格，含明暗主题、响应式、滚动微交互）
- **通义千问 DashScope**（OpenAI 兼容）— RAG 的 embedding + 对话，未配 Key 时自动降级
- **Resend** — 留言邮件通知，未配 Key 时打印控制台
- **本地文件存储**（开发期）/ **Postgres + pgvector**（生产期，预留开关）

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
│  ├─ messages.json         # 运行时生成（已 gitignore）
│  └─ vectors.json          # 运行时生成（已 gitignore）
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
| `DATABASE_URL` | Postgres 连接串（启用 pgvector）。**填了后留言/向量自动切 Postgres** | 生产推荐 |
| `NEXT_PUBLIC_SITE_NAME` / `NEXT_PUBLIC_SITE_URL` | SEO 站点名与域名 | 否 |

## 部署到 Vercel（对外开放）

1. 把 `personal-site/` 推到 GitHub（或 `npx vercel` 直接部署）。
2. 在 Vercel 项目 **Settings → Environment Variables** 填入上述变量
   （至少 `ADMIN_USER` / `ADMIN_PASS` / `AUTH_SECRET`；推荐加 `QWEN_API_KEY` 与 `RESEND_API_KEY`）。
3. 部署后访问首页即可；后台在 `/admin`。

> **Serverless 文件系统只读提醒**：Vercel 等平台运行时文件系统不可写。
> - 语料 `corpus.json` 在**构建时**已随仓库包含，只读读取正常（首页下拉、RAG 检索都 OK）。
>   要更新语料：本地改 `data/corpus.json` 后重新部署，或接入下方 Postgres 方案。
> - 留言：配置 `RESEND_API_KEY` 后**实时邮件通知你**（即使不接数据库也能收到）。
> - 后台"查看历史留言"需要持久库：填 `DATABASE_URL`（Supabase/Neon，启用 pgvector），
>   存储自动从本地文件切换到 Postgres（见下方 TODO）。

## 后台使用

1. 访问 `/admin`，用 `ADMIN_USER` / `ADMIN_PASS` 登录。
2. **上传 RAG 语料**：粘贴文档内容（空行分段），配 `QWEN_API_KEY` 后自动向量化入库；
   未配 Key 时仍会存入 `corpus.json`（聊天走关键词降级）。
3. **查看留言**：登录后可看到所有访客留言。

## RAG 严格性

`lib/rag.ts` 的 system prompt 强制要求：严格基于资料、不得编造；资料外问题明确说
"这方面资料里没有提到"；回答末尾标注引用来源。配 Key 后即为真实 RAG，幻觉风险低。

## 已知 TODO（生产增强）

- [ ] `lib/store.ts` 与 `admin/docs` 的 Postgres 持久化分支（当前仅本地文件写入，
      生产 Serverless 不可写；已预留 `DATABASE_URL` 判断）。
- [ ] 简历 PDF：将真实 `public/resume.pdf` 放入，前端弹窗已用 `<iframe>` 占位可直连。
- [ ] 可选：访客匿名统计（看哪些地区/公司在浏览，助力求职）。

## 设计稿

前端视觉基于 `design-previews/style-a-refined.html`（极简商务 · 左侧固定侧边栏 + 右侧滚动内容）。
