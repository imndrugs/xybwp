export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''

  const groupMetadata = await conn.groupMetadata(jid).catch(() => null)
  if (!groupMetadata) {
    return conn.sendMessage(jid, {
      text: '⚠️ Este comando solo funciona en grupos'
    }, { quoted: m })
  }

  const botJid = conn.user?.id || conn.user?.jid || ''
  const botNormalized = botJid.split('@')[0].split(':')[0] + '@s.whatsapp.net'

  const participants = groupMetadata.participants || []
  const mentions = participants
    .filter(p => {
      const pid = p.id.split('@')[0].split(':')[0] + '@s.whatsapp.net'
      return pid !== botNormalized
    })
    .map(p => p.id)

  if (!mentions.length) {
    return conn.sendMessage(jid, {
      text: '⚠️ No hay participantes para mencionar'
    }, { quoted: m })
  }

  const senderName = db.contacts?.[normalize(m.key?.participant || m.key?.remoteJid)] || m.pushName || 'Alguien'
  const count = mentions.length

  await conn.sendMessage(jid, {
    text: `📢 *${senderName}* ha invocado a todos (${count})`,
    mentions
  }, { quoted: m })
}

function normalize(jid) {
  if (!jid) return ''
  return jid.split('@')[0].split(':')[0] + '@s.whatsapp.net'
}
