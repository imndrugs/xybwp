import { isOwner, getSenderId, clean } from '../lib/perms.js'
import { canUse } from '../lib/roles.js'

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''
  const sender = getSenderId(m)

  if (!canUse(sender, ['owner', 'admin'], db)) {
    return conn.sendMessage(jid, { text: '⛔ Solo el owner o admins pueden usar esto' }, { quoted: m })
  }

  const groupMetadata = await conn.groupMetadata(jid).catch(() => null)
  if (!groupMetadata) {
    return conn.sendMessage(jid, { text: 'Este comando solo funciona en grupos' }, { quoted: m })
  }

  try {
    const participant = m.key?.participant || m.message?.extendedTextMessage?.contextInfo?.participant
    
    if (!participant) {
      return conn.sendMessage(jid, { text: 'No puedo determinar tu JID' }, { quoted: m })
    }

    await conn.groupParticipantsUpdate(jid, [participant], 'promote')
    const text = `⭐ PROMOCIONADO\n\nAhora eres admin del grupo`
    await conn.sendMessage(jid, { text }, { quoted: m })
  } catch (error) {
    console.error('Error en autoadmin:', error)
    await conn.sendMessage(jid, { text: 'Error: No pude promoverte como admin. Asegúrate de que el bot sea admin del grupo.' }, { quoted: m })
  }
}
