import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { z } from 'zod'
import {
  WatchCreateSchema,
  UserSettingsSchema,
  rateLimitKey,
  decimalToNumber,
  ProductPreviewSchema,
  GoogleShoppingSearchSchema,
} from '@pricedropp/shared'
import { Prisma } from '@pricedropp/db'
import { Context } from './context'
import { fetchProductPreview, ensureCachedAsset } from '../lib/product-metadata'
import { searchGoogleShopping } from '../lib/google-shopping'

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
      const { url, targetPrice, categorySlug, title, imageUrl, imageCacheId } = input
      const u = new URL(url)
      const currency = 'NZD'
      let resolvedTitle = title?.trim()
      let resolvedImageUrl = imageUrl?.trim() || undefined
      let resolvedImageCacheId = imageCacheId

      if (!resolvedTitle || !resolvedImageUrl || !resolvedImageCacheId) {
        try {
          const preview = await fetchProductPreview(url)
          if (!resolvedTitle && preview.title) resolvedTitle = preview.title
          if (preview.image) {
            resolvedImageUrl = preview.image.sourceUrl
            resolvedImageCacheId = preview.image.id
          }
        } catch (error) {
          console.error('Failed to fetch product preview for watch.create', error)
        }
      }

      if (!resolvedImageCacheId && resolvedImageUrl) {
        try {
          const asset = await ensureCachedAsset(resolvedImageUrl)
          resolvedImageCacheId = asset?.id
        } catch (error) {
          console.error('Failed to cache product image', error)
        }
      }

      const titleForCreate = resolvedTitle || url
      const createProductData: Prisma.ProductCreateInput = {
        url,
        host: u.host,
        title: titleForCreate,
        image: resolvedImageUrl ?? null,
        currency,
        lastPrice: new Prisma.Decimal(targetPrice),
        imageCache: resolvedImageCacheId ? { connect: { id: resolvedImageCacheId } } : undefined,
      }
      const updateProductData: Prisma.ProductUpdateInput = {}
      if (resolvedTitle) updateProductData.title = resolvedTitle
      if (resolvedImageUrl) updateProductData.image = resolvedImageUrl
      if (resolvedImageCacheId) {
        updateProductData.imageCache = { connect: { id: resolvedImageCacheId } }
      } else if (resolvedImageUrl) {
        updateProductData.imageCache = { disconnect: true }
      }
      let product: Prisma.Product
      try {
        product = await ctx.prisma.product.upsert({
          where: { url },
          create: createProductData,
          update: updateProductData,
        })
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.message.includes('Unknown argument `imageCache`')
        ) {
          console.warn(
            'Prisma client missing imageCache relation, retrying product upsert without cached asset linkage'
          )
          const createFallback = { ...createProductData } as Prisma.ProductCreateInput & Record<string, unknown>
          const updateFallback = { ...updateProductData } as Prisma.ProductUpdateInput & Record<string, unknown>
          delete createFallback.imageCache
          delete updateFallback.imageCache
          product = await ctx.prisma.product.upsert({
            where: { url },
            create: createFallback as Prisma.ProductCreateInput,
            update: updateFallback as Prisma.ProductUpdateInput,
          })
        } else {
          throw error
        }
      }
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
    preview: t.procedure.input(ProductPreviewSchema).query(async ({ input }) => {
      const preview = await fetchProductPreview(input.url)
      return preview
    }),
    googleShopping: t.procedure.input(GoogleShoppingSearchSchema).query(async ({ input }) => {
      const results = await searchGoogleShopping(input.query)
      return results
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
