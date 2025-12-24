# Dockerfile
FROM node:20-alpine AS base

WORKDIR /app

# 安装pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# ---- Dependencies ----
FROM base AS deps

# 安装编译依赖（better-sqlite3 需要）
RUN apk add --no-cache python3 make g++

COPY package.json pnpm-lock.yaml .npmrc ./
# 设置环境变量允许 better-sqlite3 运行构建脚本
ENV PNPM_ONLY_BUILT_DEPENDENCIES=better-sqlite3
RUN pnpm install --frozen-lockfile

# ---- Builder ----
FROM base AS builder

# 【授权系统 V3】不再需要 LICENSE_VERIFICATION_KEY
# V3 使用内置加密机制，完全离线验证

# 安装编译依赖（better-sqlite3 需要）
RUN apk add --no-cache python3 make g++

COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml .npmrc ./
COPY . .

# 重新编译 better-sqlite3（确保在目标平台编译）
RUN cd node_modules/better-sqlite3 && npm run build-release

# 构建Next.js应用（包含代码混淆）
ENV NEXT_TELEMETRY_DISABLED=1
# 使用内存数据库和临时加密密钥进行构建（避免构建时需要实际配置）
ENV DATABASE_URL="file::memory:"
ENV ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
# 创建构建时需要的目录
RUN mkdir -p data
RUN pnpm build:production

# ---- Production ----
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1

# 安装 FFmpeg 8.0.1 静态二进制（用于本地视频处理）
COPY --from=mwader/static-ffmpeg:8.0.1 /ffmpeg /usr/local/bin/
COPY --from=mwader/static-ffmpeg:8.0.1 /ffprobe /usr/local/bin/

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/styles ./styles
COPY --from=builder /app/lib/db/schema.sql ./lib/db/schema.sql
COPY --from=builder /app/resource/fonts ./resource/fonts
COPY --from=builder /app/scripts/entrypoint.sh ./scripts/entrypoint.sh
COPY --from=builder /app/scripts/init-database.js ./scripts/init-database.js

# 设置脚本可执行权限
RUN chmod +x ./scripts/entrypoint.sh

# 【授权系统 V3】完全离线验证
# - 使用内置加密验证
# - 客户映射表仅供翔宇工作流本地维护（不打包到镜像）
# - Docker 镜像显示客户为 "Customer #N"

# 创建数据目录
RUN mkdir -p /data /temp /output /logs && \
    chown -R nextjs:nodejs /data /temp /output /logs

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 使用 shell 入口点脚本启动
# shell export 确保 SESSION_SECRET 对 Next.js Edge Runtime 可见
CMD ["/bin/sh", "scripts/entrypoint.sh"]
