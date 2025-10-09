import { Worker } from 'bullmq'
import Redis from 'ioredis'
import { prisma } from '@pricedropp/db'
import { scrapeQueue, alertsEvalQueue, alertsDigestQueue, defaultJobOpts, registerEvents, ScrapeJobData } from './queues'
import { scrapeProduct } from './scraper'
import { evaluateAlerts } from './alerts'

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
registerEvents()

new Worker<ScrapeJobData>('scrape:product', async (job) => {
  const { productId, url, host } = job.data
  const parsed = await scrapeProduct(url, host)
  await prisma.product.update({ where: { id: productId }, data: { lastPrice: parsed.price.toNumber(), currency: parsed.currency } })
  await prisma.priceHistory.create({ data: { productId, price: parsed.price.toNumber(), currency: parsed.currency } })
  await alertsEvalQueue.add('evaluate', { productId }, defaultJobOpts())
}, { connection })

new Worker<{ productId: string }>('alerts:evaluate', async (job) => {
  const { productId } = job.data
  await evaluateAlerts(productId)
}, { connection })

new Worker('alerts:digest', async () => {
}, { connection })

async function bootstrapCron() {
  setInterval(async () => {
    const products = await prisma.product.findMany({ select: { id: true, url: true, host: true } })
    for (const p of products) {
      await scrapeQueue.add('scrape', { productId: p.id, url: p.url, host: p.host }, defaultJobOpts(Math.floor(Math.random() * 5000)))
    }
  }, 1000 * 60 * 30)
}

bootstrapCron()
  .then(() => console.log('Worker started'))
  .catch((e) => { console.error(e); process.exit(1) })

