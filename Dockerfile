# 腾讯云「云托管」容器部署(Next.js standalone, 多阶段自包含构建)
# 构建在镜像内完成, 仓库无需提交 .next, 支持「连 GitHub 仓库 → Dockerfile」一键部署
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs
# standalone 输出: 仅复制运行所需文件
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# 种子语料需随镜像(只读读取)
COPY --from=builder /app/data/corpus.json ./data/corpus.json
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
