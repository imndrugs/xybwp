import { isOwner } from '../lib/perms.js'

export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  const sender = m.key?.participant || m.key?.remoteJid
  if (!isOwner(sender)) return conn.sendMessage(chat, { text: '⛔ Solo owners' }, { quoted: m })

  const style = args[0]
  if (!style || !['default', 'simple', 'list'].includes(style)) {
    return conn.sendMessage(chat, { text: '⚠️ Estilos: default, simple, list\nUso: .setmenu <estilo>' }, { quoted: m })
  }

  global.db.config.menuStyle = style
  conn.sendMessage(chat, { text: `✅ Estilo de menú cambiado a *${style}*\n\n*CKV BOT*` }, { quoted: m })
}
