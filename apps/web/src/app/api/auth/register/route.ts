import { hash } from 'bcryptjs'
import { NextResponse } from 'next/server'
import { prisma } from '@pricedropp/db'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().max(80).optional(),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 })
  }

  const email = parsed.data.email.trim().toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email already registered.' }, { status: 409 })
  }

  const passwordHash = await hash(parsed.data.password, 12)
  await prisma.user.create({
    data: {
      email,
      name: parsed.data.name?.trim(),
      passwordHash,
    },
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}

