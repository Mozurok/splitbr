# Multi-stage: build no monorepo completo, runtime enxuto em node:24-slim
# (guia 2026: slim por padrao; alpine so com musl testado).
# Build a partir da RAIZ do repositorio:
#   docker build -f packages/mock/Dockerfile -t splitbr/mock .
FROM node:24-slim AS build
RUN corepack enable
WORKDIR /repo
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json* tsconfig.base.json ./
COPY packages ./packages
RUN pnpm install --frozen-lockfile && pnpm -r build \
  && pnpm --filter @splitbr/mock deploy --prod --legacy /saida

FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /saida .
EXPOSE 8377
USER node
CMD ["node", "bin/splitbr-mock.mjs", "--host", "0.0.0.0"]
