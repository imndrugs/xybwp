import { isOwner } from '../lib/perms.js'

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''
  const sender = m.key?.participant || m.key?.remoteJid || ''

  const link = args[0]
  if (!link || !link.includes('chat.whatsapp.com/')) {
    return conn.sendMessage(jid, {
      text: '⚠️ Envía un link de grupo\nUso: .join https://chat.whatsapp.com/...'
    }, { quoted: m })
  }

  const raw = link.split('chat.whatsapp.com/')[1] || ''
  const code = raw.split(/[?/\s]/)[0].trim()

  if (!code || code.length < 5) {
    return conn.sendMessage(jid, {
      text: '⚠️ No pude extraer el código del link. Verifica que sea un link válido.'
    }, { quoted: m })
  }

  console.log('Join code:', code, 'Length:', code.length)

  await conn.sendMessage(jid, { text: '⏳ Intentando unirme al grupo...' }, { quoted: m })

  try {
    let groupJid = null
    const maxRetries = 3
    for (let i = 0; i < maxRetries; i++) {
      try {
        groupJid = await conn.groupAcceptInvite(code)
        if (groupJid) break
      } catch (retryErr) {
        const msg = retryErr?.message || ''
        if (msg.includes('account_reachout_restricted') && i < maxRetries - 1) {
          console.log(`Join retry ${i + 1}/${maxRetries} after restriction...`)
          await new Promise(r => setTimeout(r, 5000))
          continue
        }
        throw retryErr
      }
    }
    if (!groupJid) {
      throw new Error('La API retornó vacío — link expirado o grupo lleno')
    }

    const info = await conn.groupMetadata(groupJid)
    await conn.sendMessage(jid, {
      text: `✅ Me uní a *${info.subject}* (${info.participants.length} miembros)\n\n*CKV BOT*`
    }, { quoted: m })
  } catch (e) {
    console.error('Join error:', e)
    await conn.sendMessage(jid, {
      text: `❌ No pude unirme al grupo\n• ${e.message || 'Link inválido o expirado'}`
    }, { quoted: m })
  }
}