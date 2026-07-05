import { getSenderId, clean } from '../lib/perms.js'

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''
  const sender = getSenderId(m)

  let who = null

  const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
  if (quotedMsg) {
    who = m.message?.extendedTextMessage?.contextInfo?.participant || sender
  }

  const mentionedJid = m.message?.extendedTextMessage?.contextInfo?.mentionedJid
  if (!who && mentionedJid?.[0]) {
    who = mentionedJid[0]
  }

  if (!who && args.length > 0) {
    let numero = args.join('').replace(/[^0-9]/g, '')
    if (numero.length < 10) {
      return conn.sendMessage(jid, { text: '⚠️ Número inválido. Usa el código de país.\nEj: .pfp 525644444644' }, { quoted: m })
    }
    who = numero
  }

  if (!who) {
    who = sender
  }

  who = clean(who)
  const whoFull = who.includes('@') ? who : who + '@s.whatsapp.net'

  try {
    const ppUrl = await conn.profilePictureUrl(whoFull, 'image')

    await conn.sendMessage(jid, { text: '📸 Guardando foto...' }, { quoted: m })

    await conn.updateProfilePicture(conn.user?.id || conn.user?.jid, { url: ppUrl })

    await conn.sendMessage(jid, {
      image: { url: ppUrl },
      caption: `Foto de @${who}`,
      mentions: [whoFull]
    }, { quoted: m })
  } catch (error) {
    console.error('❌ Error en pfp:', error?.message)
    await conn.sendMessage(jid, {
      text: `👤 @${who} no tiene foto de perfil o la tiene privada`,
      mentions: [whoFull]
    }, { quoted: m })
  }
}
