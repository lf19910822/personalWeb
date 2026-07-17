# 腾讯云「云托管」容器部署用的镜像(Next.js standalone)
FROM node:20-alpine AS base
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# standalone 输出:仅复制必要文件
COPY .next/standalone ./
COPY .next/static ./.next/static
COPY public ./public

# 种子语料需要随镜像(只读读取)
COPY data/corpus.json ./data/corpus.json

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
