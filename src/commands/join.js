import { isOwner } from '../lib/perms.js'

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''
  const sender = m.key?.participant || m.key?.remoteJid || ''

  if (!isOwner(sender)) {
    return conn.sendMessage(jid, { text: '🚫 Solo owners pueden usar este comando' }, { quoted: m })
  }

  const link = args[0]
  if (!link || !link.includes('chat.whatsapp.com/')) {
    return conn.sendMessage(jid, {
      text: '⚠️ Envía un link de grupo\nUso: .join https://chat.whatsapp.com/...'
    }, { quoted: m })
  }

  await conn.sendMessage(jid, { text: '⏳ Intentando unirme al grupo...' }, { quoted: m })

  const code = link.split('/').pop().split('?')[0].trim()

  try {
    const groupJid = await conn.groupAcceptInvite(code)
    if (!groupJid) throw new Error('Código inválido')

    const info = await conn.groupMetadata(groupJid)
    await conn.sendMessage(jid, {
      text: `✅ Me uní al grupo:\n*${info.subject}*\n👥 ${info.participants.length} miembros`
    }, { quoted: m })
  } catch (e) {
    console.error('Join error:', e)
    await conn.sendMessage(jid, {
      text: '❌ No pude unirme al grupo\n• Link inválido o expirado\n• El grupo puede estar lleno'
    }, { quoted: m })
  }
}