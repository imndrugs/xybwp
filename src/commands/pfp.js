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

  const targetNum = clean(target)
  if (!targetNum || clean(botJid).includes(targetNum)) {
    return conn.sendMessage(chat, { text: '⚠️ No puedes usar mi foto de perfil' }, { quoted: m })
  }

  // Probar 3 formatos de JID
  const jids = [
    targetNum + '@s.whatsapp.net',
    targetNum + '@c.us',
    target,
  ]

  let ppUrl
  for (const jid of jids) {
    try {
      ppUrl = await conn.profilePictureUrl(jid, 'image')
      if (ppUrl) break
    } catch (e) {
      console.log('pfp try', jid, '->', e.message)
    }
    try {
      ppUrl = await conn.profilePictureUrl(jid, 'preview')
      if (ppUrl) break
    } catch (e) {
      console.log('pfp preview try', jid, '->', e.message)
    }
  }

  console.log('pfp target:', target, 'num:', targetNum, 'url:', ppUrl)

  if (!ppUrl) {
    return conn.sendMessage(chat, {
      text: `👤 @${targetNum} no tiene foto de perfil o es privada`,
      mentions: [targetNum + '@s.whatsapp.net']
    }, { quoted: m })
  }

  try {
    await conn.sendMessage(chat, { text: '📸 Guardando foto...' }, { quoted: m })

    await conn.updateProfilePicture(botJid, { url: ppUrl }).catch(e => {
      console.log('pfp updateProfilePicture error:', e.message)
    })

    await conn.sendMessage(chat, { image: { url: ppUrl }, caption: `Foto de @${targetNum}` }, { quoted: m })
  } catch (e) {
    console.log('pfp error:', e.message)
    await conn.sendMessage(chat, {
      text: `❌ Error al obtener la foto de @${targetNum}`,
      mentions: [targetNum + '@s.whatsapp.net']
    }, { quoted: m })
  }
}
