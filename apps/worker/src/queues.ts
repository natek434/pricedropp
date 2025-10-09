import { Queue, Worker, QueueEvents, JobsOptions } from 'bullmq'
import Redis from 'ioredis'

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export const scrapeQueue = new Queue('scrape:product', { connection })
export const alertsEvalQueue = new Queue('alerts:evaluate', { connection })
export const alertsDigestQueue = new Queue('alerts:digest', { connection })

export type ScrapeJobData = { productId: string; url: string; host: string }

export function defaultJobOpts(delayMs = 0): JobsOptions {
  return { attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: 1000, removeOnFail: 1000, delay: delayMs }
}

export function registerEvents() {
  new QueueEvents('scrape:product', { connection })
  new QueueEvents('alerts:evaluate', { connection })
  new QueueEvents('alerts:digest', { connection })
}

