import { isOwner } from '../lib/perms.js'

export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  const sender = m.key?.participant || m.key?.remoteJid
  if (!isOwner(sender)) return conn.sendMessage(chat, { text: '⛔ Solo owners' }, { quoted: m })

  const text = args.join(' ')
  if (!text) return conn.sendMessage(chat, { text: '⚠️ Uso: .bc <mensaje>' }, { quoted: m })

  let sent = 0
  let failed = 0
  for (const [jid] of Object.entries(global.db.contacts || {})) {
    if (!jid.endsWith('@g.us')) continue
    try {
      await conn.sendMessage(jid, { text: `📢 *COMUNICADO*\n\n${text}` })
      sent++
    } catch { failed++ }
    await new Promise(r => setTimeout(r, 300))
  }
  conn.sendMessage(chat, { text: `✅ Broadcast enviado a ${sent} grupos${failed ? `, ${failed} fallaron` : ''}\n\n*CKV BOT*` }, { quoted: m })
}
