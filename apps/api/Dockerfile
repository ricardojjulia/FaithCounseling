FROM node:22-alpine AS base
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.7.0 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/ ./packages/

COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --filter @churchcore/api...

COPY apps/api/src/ ./apps/api/src/

EXPOSE 3001
CMD ["node", "apps/api/src/index.js"]
