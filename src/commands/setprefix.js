import { isOwner } from '../lib/perms.js'

export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  const sender = m.key?.participant || m.key?.remoteJid
  if (!isOwner(sender)) return conn.sendMessage(chat, { text: '⛔ Solo owners' }, { quoted: m })

  const prefix = args[0]
  if (!prefix) return conn.sendMessage(chat, { text: '⚠️ Uso: .setprefix <prefijo>' }, { quoted: m })

  global.db.config.prefix = prefix
  conn.sendMessage(chat, { text: `✅ Prefijo cambiado a \`${prefix}\`\n\n*CKV BOT*` }, { quoted: m })
}
