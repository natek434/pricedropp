FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* .npmrc* ./
COPY packages ./packages
COPY apps/web/package.json ./apps/web/package.json
RUN corepack enable && pnpm -v && pnpm install --frozen-lockfile

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && pnpm --filter @pricedropp/db prisma:generate && pnpm --filter @pricedropp/web build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/apps/web/.next ./.next
COPY --from=build /app/apps/web/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000"]
