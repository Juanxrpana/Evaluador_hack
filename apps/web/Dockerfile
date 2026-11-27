# syntax=docker/dockerfile:1

FROM node:26-slim AS build

RUN npm install -g pnpm@12.23.0

WORKDIR /workspace

# Copy only workspace manifests first so dependency installation is cached.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN pnpm install --frozen-lockfile

COPY packages/contracts packages/contracts
COPY apps/web apps/web

RUN pnpm --filter @repo/contracts build \
  && pnpm --filter @repo/web build

FROM nginx:alpine AS runtime

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html

EXPOSE 80
