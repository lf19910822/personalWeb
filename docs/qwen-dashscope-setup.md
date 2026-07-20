# 为本项目开通并配置通义千问（DashScope）

本文只覆盖当前项目的 RAG 配置：`qwen-plus` 负责生成回答，`text-embedding-v3` 负责把资料和问题转成向量。项目已经通过 DashScope 的 OpenAI 兼容接口调用二者；不需要安装额外 SDK，也不需要修改代码。

> 资料核对日期：2026-07-20。模型可用范围、免费额度、优惠和单价会变化，付款前务必以阿里云的[模型调用计费页](https://help.aliyun.com/zh/model-studio/model-pricing)和控制台显示为准。

## 1. 注册、实名认证并开通百炼

1. 注册或登录阿里云账号；官方快速开始要求使用**阿里云主账号**开通百炼。
2. 打开[阿里云百炼模型广场](https://bailian.console.aliyun.com/?tab=model#/model-market)，阅读并同意服务协议以开通服务；若没有出现协议，表示该账号已开通。
3. 如果流程提示尚未实名认证，按提示完成实名认证后再继续。

以上开通、主账号和实名认证要求均来自阿里云的[首次调用千问 API：账号设置](https://help.aliyun.com/zh/model-studio/first-api-call-to-qwen)。

## 2. 计费、充值与额度

当前项目调用的是按 Token 计费的模型 API。百炼官方说明模型调用默认是**按量计费**；中国内地部分模型可能有开通后的免费额度，其他服务部署范围不一定提供免费额度。首次开通时的免费额度、地域限制和有效期以[免费额度说明](https://help.aliyun.com/zh/model-studio/new-free-quota)为准。请在[模型调用计费页](https://help.aliyun.com/zh/model-studio/model-pricing)按你的服务部署范围查看 `qwen-plus` 和 `text-embedding-v3` 的现行单价。

建议的操作顺序：

1. 先开通并创建 API Key，利用适用的免费额度完成本地测试。
2. 需要持续使用或免费额度不足时，打开阿里云官方[充值页面](https://billing-cost.console.aliyun.com/fortune/fund-management/recharge)，为该阿里云账号充值，并在费用中心确认余额和账单。
3. 充值后回到百炼的[模型调用计费页](https://help.aliyun.com/zh/model-studio/model-pricing)再次核对模型与地域价格。不要根据本文或旧截图决定充值金额。

启用付费前，建议在百炼[免费额度管理页](https://bailian.console.aliyun.com/?tab=costing-balance#/costing-balance/free-quota)打开“免费额度用尽后停止服务”（如界面提供该选项），避免额度耗尽后继续产生按量费用。免费额度耗尽后的计费和该开关的说明见[官方免费额度文档](https://help.aliyun.com/zh/model-studio/new-free-quota)。

本项目无需为它单独购买某个“`qwen-plus` 包”；它配置的是百炼 API 的按量调用方式。计费模式依据同一份官方计费文档。

## 3. 创建并保管 API Key

1. 打开百炼的[API Key 管理页](https://bailian.console.aliyun.com/?tab=model#/api-key)。
2. 点击“创建 API Key”，创建后立即复制并保存在密码管理器中。
3. API Key 只放在服务端环境变量中；不要发到聊天记录、截图、Issue，也不要提交到 Git。
4. 若怀疑泄露，立刻在同一页面禁用/删除旧 Key 并创建新 Key，然后替换部署平台和本机的配置。

阿里云官方快速开始明确建议将 Key 配置为环境变量，避免硬编码到代码中；创建入口和该建议见[获取并配置 API Key](https://help.aliyun.com/zh/model-studio/first-api-call-to-qwen#account-settings)。

> 官方示例使用变量名 `DASHSCOPE_API_KEY`；**这个仓库读取的是 `QWEN_API_KEY`**，因此不要把 Key 填到前者，也不要使用任何 `NEXT_PUBLIC_` 前缀。该变量名差异来自本项目的实现，而不是百炼控制台设置。

## 4. 填写本项目的 `.env.local`

打开项目根目录已有的 `.env.local`，只替换等号右侧的真实 Key，不要给它加引号或提交该文件：

```dotenv
# 阿里云百炼 API Key（sk-...）
QWEN_API_KEY=sk-替换为你刚创建的真实Key

# 以下两项可保留默认值；当前项目就是按这两个模型实现的。
QWEN_CHAT_MODEL=qwen-plus
QWEN_EMBED_MODEL=text-embedding-v3
```

模型选择的理由：

- `qwen-plus` 是项目聊天完成请求的默认模型；阿里云的[OpenAI 兼容 Chat Completions 文档](https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions)给出了该模型的 Bearer API Key 调用方式。
- `text-embedding-v3` 是项目 embedding 请求的默认模型；阿里云的[文本向量同步 API](https://help.aliyun.com/zh/model-studio/text-embedding-synchronous-api)列出该模型，并给出 OpenAI 兼容的 `/embeddings` 调用方式。
- 两个模型共用同一个百炼 API Key。项目使用兼容模式的 `/chat/completions` 与 `/embeddings` 路径，符合官方 API 文档的兼容模式接口说明（见[首次调用千问 API](https://help.aliyun.com/zh/model-studio/first-api-call-to-qwen)和[文本向量同步 API](https://help.aliyun.com/zh/model-studio/text-embedding-synchronous-api)）。

## 5. 本地验证

环境变量只会在启动时读取，所以保存 `.env.local` 后：

```bash
# 先停止正在运行的开发服务器，再重新启动
npm run dev
```

随后打开 `http://localhost:3000`，向 AI 助手提一个和站内资料有关的问题。成功时，回答不再以“演示模式：尚未配置大模型 API Key”开头，并会带引用来源。

也可以在另一个终端验证后端接口（开发服务器保持运行）：

```bash
curl -sS -X POST http://localhost:3000/api/chat \
  -H 'Content-Type: application/json' \
  --data '{"question":"请根据资料用一句话介绍这个网站。","history":[]}'
```

预期会得到含 `answer` 和 `sources` 的 JSON。若收到 401/403、余额不足或模型不可用等错误，先在百炼控制台确认：账号/实名认证状态、Key 是否来自正确账号或业务空间、模型授权和余额；再查[官方快速开始的常见调用配置](https://help.aliyun.com/zh/model-studio/first-api-call-to-qwen)。不要把报错中可能出现的 Key 贴给他人。

## 官方入口速查

- [百炼模型广场（开通服务）](https://bailian.console.aliyun.com/?tab=model#/model-market)
- [API Key 管理](https://bailian.console.aliyun.com/?tab=model#/api-key)
- [首次调用千问 API](https://help.aliyun.com/zh/model-studio/first-api-call-to-qwen)
- [模型调用计费与免费额度](https://help.aliyun.com/zh/model-studio/model-pricing)
- [新用户免费额度与额度用尽后的处理](https://help.aliyun.com/zh/model-studio/new-free-quota)
- [阿里云官方充值页面](https://billing-cost.console.aliyun.com/fortune/fund-management/recharge)
- [OpenAI 兼容 Chat Completions（`qwen-plus`）](https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions)
- [文本向量同步 API（`text-embedding-v3`）](https://help.aliyun.com/zh/model-studio/text-embedding-synchronous-api)
