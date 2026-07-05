import { clean } from '../lib/perms.js'

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''

  let who = null

  const quoted = m.message?.extendedTextMessage?.contextInfo
  if (quoted?.quotedMessage && quoted?.participant) {
    who = quoted.participant
  }

  if (!who && quoted?.mentionedJid?.length) {
    who = quoted.mentionedJid[0]
  }

  if (!who && args.length > 0) {
    const num = args.join('').replace(/\D/g, '')
    if (num.length >= 10) {
      who = num + '@s.whatsapp.net'
    } else {
      return conn.sendMessage(jid, { text: '⚠️ Número inválido. Ej: .pfp 525644444644' }, { quoted: m })
    }
  }

  if (!who) {
    who = m.key?.participant || jid
  }

  const cleaned = clean(who)
  const jidWho = cleaned + '@s.whatsapp.net'

  try {
    const ppUrl = await conn.profilePictureUrl(jidWho, 'image')
    await conn.sendMessage(jid, { text: '📸 Guardando foto...' }, { quoted: m })
    await conn.updateProfilePicture(conn.user?.id || conn.user?.jid, { url: ppUrl }).catch(() => {})
    await conn.sendMessage(jid, {
      image: { url: ppUrl },
      caption: `Foto de @${cleaned}`,
      mentions: [jidWho]
    }, { quoted: m })
  } catch (e) {
    await conn.sendMessage(jid, {
      text: `👤 @${cleaned} no tiene foto de perfil o es privada`,
      mentions: [jidWho]
    }, { quoted: m })
  }
}
