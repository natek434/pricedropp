import { z } from 'zod'

export const WatchCreateSchema = z.object({
  url: z.string().url(),
  targetPrice: z.number().positive(),
  categorySlug: z.string().optional(),
  tags: z.array(z.string()).optional(),
  selectorOverride: z.string().optional()
})

export const UserSettingsSchema = z.object({
  quietHoursStart: z.number().int().min(0).max(23).nullable().optional(),
  quietHoursEnd: z.number().int().min(0).max(23).nullable().optional(),
  maxAlertsPerDay: z.number().int().min(1).max(20).optional(),
  digestHour: z.number().int().min(0).max(23).nullable().optional(),
  nearTargetPercent: z.number().int().min(0).max(50).optional(),
  nearTargetCooldownH: z.number().int().min(1).max(168).optional(),
  timezone: z.string().optional(),
  defaultCurrency: z.string().length(3).optional(),
  telegramChatId: z.string().optional()
})

export const FeedQuerySchema = z.object({
  sort: z.enum(['recent', 'popular']).default('recent'),
  page: z.coerce.number().int().min(1).default(1),
  category: z.string().optional(),
  tag: z.string().optional()
})

export type WatchCreateInput = z.infer<typeof WatchCreateSchema>
export type UserSettingsInput = z.infer<typeof UserSettingsSchema>

