import { request } from 'undici'

export async function sendTelegram(token: string, chatId: string, text: string) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`
  await request(url, {
    method: 'POST',
    body: new URLSearchParams({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: 'true' })
  })
}

export type EmailOptions = { from: string; to: string; subject: string; text: string; html?: string }

export async function sendEmailSMTP(opts: EmailOptions) {
  // Placeholder: delegate to worker via webhook or job if needed
  return opts
}

export function onTargetTemplate(item: { title: string; price: string; target: string; url: string }) {
  return `✅ Price hit your target\nItem — ${item.price} (target ${item.target})\nLink → ${item.url}\nMute 12 h | Adjust target`
}

export function nearTargetTemplate(item: { within: number; title: string; price: string; target: string; url: string }) {
  const within = Math.round(item.within)
  return `👀 Close to your target (within ${within} %)\nItem — ${item.price} (target ${item.target})\nLink → ${item.url}\nSnooze 24 h | Tighten target`
}

