# syntax=docker/dockerfile:1

FROM node:26-slim AS build

ENV ONNXRUNTIME_NODE_INSTALL_CUDA=skip

RUN npm install -g pnpm@12.23.0

WORKDIR /workspace

# Copy only workspace manifests first so dependency installation is cached.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN pnpm install --frozen-lockfile

COPY packages/contracts packages/contracts
COPY apps/api apps/api

RUN pnpm --filter @repo/contracts build \
  && pnpm --filter @repo/api build \
  && pnpm --filter @repo/api deploy --prod /app

FROM node:26-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app /app

EXPOSE 3000

CMD ["node", "dist/index.js"]
