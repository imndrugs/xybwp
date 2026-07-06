import { isOwner } from '../lib/perms.js'

export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  const sender = m.key?.participant || m.key?.remoteJid
  if (!isOwner(sender)) return conn.sendMessage(chat, { text: '⛔ Solo owners' }, { quoted: m })

  await conn.sendMessage(chat, { text: '♻️ Reiniciando...\n\n*CKV BOT*' }, { quoted: m })
  process.exit(0)
}
