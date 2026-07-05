import { clean } from '../lib/perms.js'

export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid || ''
  const botJid = conn.user?.id || conn.user?.jid || ''

  let target = null
  const ctx = m.message?.extendedTextMessage?.contextInfo

  if (ctx?.participant && ctx?.quotedMessage) {
    target = ctx.participant
  }

  if (!target && ctx?.mentionedJid?.length) {
    target = ctx.mentionedJid[0]
  }

  if (!target && args.length) {
    const digits = args.join('').replace(/\D/g, '')
    if (digits.length >= 10) {
      target = digits + '@s.whatsapp.net'
    } else {
      return conn.sendMessage(chat, { text: '⚠️ Número inválido. Ej: .pfp 525644444644' }, { quoted: m })
    }
  }

  if (!target) {
    target = m.key?.participant || chat
  }

  const number = clean(target)
  const fullJid = number + '@s.whatsapp.net'

  try {
    const ppUrl = await conn.profilePictureUrl(fullJid, 'image')
    const res = await fetch(ppUrl)
    const buffer = Buffer.from(await res.arrayBuffer())

    await conn.sendMessage(chat, { text: '📸 Guardando foto...' }, { quoted: m })
    await conn.updateProfilePicture(botJid, buffer).catch(() => {})
    await conn.sendMessage(chat, { image: buffer, caption: `Foto de @${number}` }, { quoted: m })
  } catch (e) {
    console.log('pfp error:', e)
    await conn.sendMessage(chat, {
      text: `👤 @${number} no tiene foto de perfil o es privada`,
      mentions: [fullJid]
    }, { quoted: m })
  }
}
