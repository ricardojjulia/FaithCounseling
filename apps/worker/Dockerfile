FROM node:22-alpine AS base
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.7.0 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/ ./packages/

COPY apps/worker/package.json ./apps/worker/
RUN pnpm install --frozen-lockfile --filter @churchcore/worker...

COPY apps/worker/src/ ./apps/worker/src/

CMD ["node", "apps/worker/src/index.js"]
