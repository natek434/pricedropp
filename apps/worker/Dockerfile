FROM mcr.microsoft.com/playwright:v1.47.2-jammy
WORKDIR /app
COPY package.json pnpm-lock.yaml* .npmrc* ./
COPY packages ./packages
COPY apps/worker/package.json ./apps/worker/package.json
RUN corepack enable && pnpm -v && pnpm install --frozen-lockfile && npx playwright install --with-deps chromium
COPY . .
ENV TZ=${TZ}
RUN pnpm --filter @pricedropp/db prisma:generate && pnpm --filter @pricedropp/worker build
CMD ["node", "apps/worker/dist/index.js"]

