import { hash } from 'bcryptjs'
import { prisma } from './index'

async function main() {
  const categories = [
    { name: 'Electronics', slug: 'electronics' },
    { name: 'Home', slug: 'home' },
    { name: 'Gaming', slug: 'gaming' },
    { name: 'Fuel', slug: 'fuel' },
  ]
  for (const c of categories) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c })
  }

  const tags = [
    { name: 'Laptop', slug: 'laptop' },
    { name: 'Headphones', slug: 'headphones' },
    { name: 'Console', slug: 'console' },
  ]
  for (const t of tags) {
    await prisma.tag.upsert({ where: { slug: t.slug }, update: {}, create: t })
  }

  const rules = [
    { host: 'www.amazon.com', selectors: ['#corePriceDisplay_desktop_feature_div .a-offscreen'], waitMs: 2500 },
    { host: 'www.newegg.com', selectors: ['.price-current strong', '.price-current sup'], waitMs: 2000 },
    { host: 'www.woolworths.co.nz', selectors: ['.priceCupAdjustmentDev .presentPrice'], waitMs: 2500 },
  ]
  for (const r of rules) {
    await prisma.siteRule.upsert({ where: { host: r.host }, update: { selectors: r.selectors, waitMs: r.waitMs }, create: r })
  }

  const demoPassword = await hash('Password123!', 12)
  await prisma.user.upsert({
    where: { email: 'demo@pricedropp.dev' },
    update: { name: 'Demo User', passwordHash: demoPassword },
    create: { email: 'demo@pricedropp.dev', name: 'Demo User', passwordHash: demoPassword },
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
