# 腾讯云持久化向量存储：个人站决策指南

## 结论

**第一选择：先用现有腾讯云 COS 持久化 `文档分块 + embedding`，检索仍在 Next.js 服务端做余弦计算。** 这不是托管向量数据库，却最贴合当前仅有简历/项目资料、低并发且已接入 COS 的站点：无需新建数据库、无需公网数据库连通性，也能让上传文档和向量在重启/重新部署后保留。COS 是腾讯云的对象存储服务，且项目已通过其 S3 兼容接口使用它。[COS 产品页](https://cloud.tencent.com/product/cos) / [S3 兼容 API 文档](https://cloud.tencent.com/document/product/436/7751)

当需要**服务端 ANN 向量检索、事务化后台 CRUD，或把留言/访客/语料统一持久化**时，再选择 **腾讯云 PostgreSQL + pgvector**。只有在语料量和查询并发明显上来、确实需要独立的专用向量检索服务时，才考虑 **腾讯云 VectorDB**。

## 方案对比

| 方案 | 持久化与检索 | Next.js 接入 | 网络与安全 | 小流量成本/复杂度 | 结论 |
|---|---|---|---|---|---|
| **COS JSON（推荐现在实施）** | 在 COS 保存 `rag/corpus.json` 和 `rag/vectors.json`；应用启动读入缓存，查询 embedding 后在进程内计算余弦相似度。持久化可靠，但**不是数据库侧 ANN 检索**。 | 直接复用现有 `lib/storage.ts` 的 `readJson`/`writeJson` 与现有 COS 凭据；不新增 SDK 或运行时服务。 | 继续使用最小权限的 COS 子账号/存储桶策略；禁止公开读写，服务端保存密钥。COS 的访问控制能力见[权限配置文档](https://cloud.tencent.com/document/product/436/13315)。 | 已有 COS 时几乎没有新增固定成本；实现量最小。对象更新不是关系型事务，应以版本号/乐观写入避免后台并发覆盖。 | 适合现在数十至数千个分块的个人站。 |
| **TencentDB for PostgreSQL + pgvector（扩展首选）** | PostgreSQL 持久化文档、分块、embedding 与业务数据；通过 `pgvector` 做向量距离查询和索引。腾讯云提供托管 PostgreSQL 产品与文档入口。[产品页](https://cloud.tencent.com/product/postgresql) / [文档中心](https://cloud.tencent.com/document/product/409) | 服务端使用标准 PostgreSQL 连接（Node 可用 `pg`）；新增连接池、迁移和 `vector` 列/索引。需在购买规格前于产品控制台确认目标版本已提供 `pgvector` 扩展。 | 优先让部署在同地域 VPC 内访问；若应用部署在 Vercel 等站外平台，才开启公网地址，并配 IP 白名单、TLS 与最小权限数据库账号。腾讯云的[访问控制概览](https://cloud.tencent.com/document/product/598/10583)和[私有网络产品页](https://cloud.tencent.com/product/vpc)可作为配置入口。 | 有实例规格的持续费用；具体地域、规格、网络费用以[价格页](https://cloud.tencent.com/product/postgresql/pricing)和购买页为准。需要维护 schema/迁移，但可替代多份 JSON。 | 资料、留言和后台数据开始增长时采用。 |
| **Tencent Cloud VectorDB（专用服务）** | 腾讯云托管的专用向量数据库，面向向量数据的存储与检索。[产品页](https://cloud.tencent.com/product/vdb) / [文档中心](https://cloud.tencent.com/document/product/1709) | 需要单独创建实例、集合并接入其数据面 SDK/API；在开始编码前，应以文档中心当期的 SDK/API 页面核实 Node.js 数据面客户端或 REST 接口，**不要仅凭管理面腾讯云 SDK 假设可完成相似度查询**。 | 应优先使用同地域私网、最小权限账号和安全组/白名单；跨公网部署会额外增加网络与密钥治理工作。 | 独立托管服务的采购、网络和运维面都高于当前需求；价格、最低规格和可用地域应在[价格页](https://cloud.tencent.com/product/vdb/pricing)及控制台实时确认。 | 对当前个人站过度配置；以后分块量、QPS 或向量检索能力成为瓶颈再评估。 |

> 本次不把 MongoDB 作为候选：本项目没有现有 MongoDB 业务数据，且在未找到可直接核实的腾讯云官方“向量检索”能力与 Node 接入文档前，不应为了 RAG 另引入一套数据模型。

## 推荐的下一步（仅方案，不在本次改代码）

1. 将 `Doc`、其 `chunks` 和每个 chunk 的 `embedding` 定义为同一份版本化 JSON（含 `embeddingModel`、维度、更新时间）。后台上传时先完成全部 embedding，再一次性写入 COS 的 `rag/index.json`；避免“文档写了但向量没写”的半完成状态。
2. `ensureLoaded()` 改为优先从 COS 读取该索引；`addDoc()` 改为读—合并—写回 COS。以现有 `storage.ts` 作为唯一持久化边界；保留本地 `data/` 作无 COS 的开发降级。
3. 检索保留当前 top-3 与余弦计算；给向量模型和维度加校验。若更换 `text-embedding-v3` 或切块规则，整库重建 embedding，不能混用不同模型/维度的向量。
4. 以后迁移 PostgreSQL 时，创建 `documents`、`chunks` 两表；以 `chunk` 为粒度存 `text`、元数据与 `vector`，先双写校验检索结果，再切换读取。此时可同时把后台文档和留言迁入，避免系统出现 COS、文件、数据库三套事实来源。

## 购买/部署前检查

- COS 路线：确认桶为私有、子账号仅有该桶所需读写权限，并配置对象版本/备份策略；价格以 [COS 价格页](https://cloud.tencent.com/product/cos/pricing) 为准。
- PostgreSQL/VectorDB 路线：先在目标地域与部署形态（CVM/容器/Serverless/Vercel）下确认私网可达性；站外部署再评估公网、IP 白名单与 TLS。
- 不把腾讯云 SecretId/SecretKey、数据库密码或连接串提交到仓库；全部写入部署平台的密钥管理/环境变量。

## 官方资料

1. [腾讯云 COS 产品与定价](https://cloud.tencent.com/product/cos) / [价格页](https://cloud.tencent.com/product/cos/pricing)
2. [COS S3 兼容 API](https://cloud.tencent.com/document/product/436/7751)；[COS 权限配置](https://cloud.tencent.com/document/product/436/13315)
3. [TencentDB for PostgreSQL 产品页](https://cloud.tencent.com/product/postgresql) / [文档中心](https://cloud.tencent.com/document/product/409) / [价格页](https://cloud.tencent.com/product/postgresql/pricing)
4. [腾讯云 VectorDB 产品页](https://cloud.tencent.com/product/vdb) / [文档中心](https://cloud.tencent.com/document/product/1709) / [价格页](https://cloud.tencent.com/product/vdb/pricing)
5. [腾讯云访问控制概览](https://cloud.tencent.com/document/product/598/10583)；[私有网络 VPC](https://cloud.tencent.com/product/vpc)

资料检索日期：2026-07-20。腾讯云的可用地域、版本扩展、最低规格与价格会变化，购买前请以对应控制台显示为准。
