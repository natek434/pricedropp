import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { z } from 'zod'
import { WatchCreateSchema, UserSettingsSchema, rateLimitKey, decimalToNumber, SimilarProductSearchSchema } from '@pricedropp/shared'
import { Prisma } from '@pricedropp/db'
import { Context } from './context'

const t = initTRPC.context<Context>().create({ transformer: superjson })

const authed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { userId: (ctx.session.user as any).id as string } })
})

export const appRouter = t.router({
  userSettings: t.router({
    get: t.procedure.use(authed).query(async ({ ctx }) => {
      const s = await ctx.prisma.userSettings.findUnique({ where: { userId: (ctx as any).userId } })
      return s
    }),
    update: t.procedure.use(authed).input(UserSettingsSchema).mutation(async ({ ctx, input }) => {
      const id = (ctx as any).userId as string
      const s = await ctx.prisma.userSettings.upsert({ where: { userId: id }, update: input, create: { userId: id, ...input } })
      return s
    }),
  }),
  watch: t.router({
    create: t.procedure.use(authed).input(WatchCreateSchema).mutation(async ({ ctx, input }) => {
      const rl = await rateLimitKey(`watch:create:${(ctx as any).userId}`, 30, 24 * 3600)
      if (!rl.allowed) throw new TRPCError({ code: 'TOO_MANY_REQUESTS' })
      const { url, targetPrice, categorySlug, title, imageUrl } = input
      const u = new URL(url)
      const currency = 'NZD'
      const createProductData: Prisma.ProductCreateInput = {
        url,
        host: u.host,
        title: title ?? url,
        image: imageUrl ?? null,
        currency,
        lastPrice: new Prisma.Decimal(targetPrice),
      }
      const updateProductData: Prisma.ProductUpdateInput = {}
      if (title) updateProductData.title = title
      if (imageUrl) updateProductData.image = imageUrl
      const product = await ctx.prisma.product.upsert({
        where: { url },
        create: createProductData,
        update: updateProductData,
      })
      if (categorySlug) {
        const c = await ctx.prisma.category.findUnique({ where: { slug: categorySlug } })
        if (c) await ctx.prisma.productCategory.upsert({ where: { productId_categoryId: { productId: product.id, categoryId: c.id } }, create: { productId: product.id, categoryId: c.id }, update: {} })
      }
      const watch = await ctx.prisma.watch.create({
        data: { userId: (ctx as any).userId, productId: product.id, targetPrice: new Prisma.Decimal(targetPrice) },
        include: { product: true },
      })
      return serializeWatch(watch)
    }),
    delete: t.procedure.use(authed).input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      await ctx.prisma.watch.delete({ where: { id: input.id, userId: (ctx as any).userId } as any })
      return true
    }),
    list: t.procedure.use(authed).query(async ({ ctx }) => {
      const watches = await ctx.prisma.watch.findMany({ where: { userId: (ctx as any).userId }, include: { product: true } })
      return watches.map(serializeWatch)
    }),
  }),
  product: t.router({
    searchSimilar: t.procedure.input(SimilarProductSearchSchema).query(async ({ ctx, input }) => {
      const { name, targetPrice, rangePercent } = input
      const span = (targetPrice * rangePercent) / 100
      const min = new Prisma.Decimal(targetPrice - span)
      const max = new Prisma.Decimal(targetPrice + span)
      const matches = await ctx.prisma.product.findMany({
        where: {
          title: { contains: name, mode: 'insensitive' },
          lastPrice: { gte: min, lte: max },
        },
        select: {
          id: true,
          title: true,
          host: true,
          currency: true,
          lastPrice: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      })
      return matches.map((product) => ({
        ...product,
        lastPrice: decimalToNumber(product.lastPrice),
      }))
    }),
  }),
  meta: t.router({
    categories: t.procedure.query(async ({ ctx }) => {
      return ctx.prisma.category.findMany({ orderBy: { name: 'asc' } })
    }),
  }),
  notify: t.router({
    test: t.procedure.use(authed).mutation(async () => true),
  }),
})

export type AppRouter = typeof appRouter

function serializeWatch(
  watch: Prisma.WatchGetPayload<{ include: { product: true } }>
) {
  return {
    ...watch,
    targetPrice: decimalToNumber(watch.targetPrice),
    product: {
      ...watch.product,
      lastPrice: decimalToNumber(watch.product.lastPrice),
    },
  }
}
