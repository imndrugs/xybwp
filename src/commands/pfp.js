import { clean } from '../lib/perms.js'

export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid || ''
  const botJid = conn.user?.id || conn.user?.jid || ''

  let target = null
  const ctx = m.message?.extendedTextMessage?.contextInfo

  if (ctx?.mentionedJid?.length) {
    target = ctx.mentionedJid[0]
  }

  if (!target && ctx?.participant) {
    target = ctx.participant
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

  const targetClean = clean(target)
  if (!targetClean || clean(botJid).includes(targetClean)) {
    return conn.sendMessage(chat, { text: '⚠️ No puedes usar mi foto de perfil' }, { quoted: m })
  }

  const fullJid = targetClean + '@s.whatsapp.net'

  let ppUrl
  try {
    ppUrl = await conn.profilePictureUrl(fullJid, 'image')
    if (!ppUrl) ppUrl = await conn.profilePictureUrl(fullJid, 'preview')
    if (!ppUrl) throw new Error('no url')
  } catch (e) {
    return conn.sendMessage(chat, {
      text: `👤 @${targetClean} no tiene foto de perfil o es privada`,
      mentions: [fullJid]
    }, { quoted: m })
  }

  try {
    await conn.sendMessage(chat, { text: '📸 Guardando foto...' }, { quoted: m })

    await conn.updateProfilePicture(botJid, { url: ppUrl }).catch(e => {
      console.log('pfp updateProfilePicture error:', e.message)
    })

    await conn.sendMessage(chat, { image: { url: ppUrl }, caption: `Foto de @${targetClean}` }, { quoted: m })
  } catch (e) {
    console.log('pfp error:', e.message)
    await conn.sendMessage(chat, {
      text: `❌ Error al obtener la foto de @${targetClean}`,
      mentions: [fullJid]
    }, { quoted: m })
  }
}
