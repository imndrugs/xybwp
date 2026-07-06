export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  if (!chat?.endsWith('@g.us')) return

  const text = args.join(' ')
  if (!text || text === 'off') {
    if (text === 'off') {
      delete global.db.config.welcome[chat]
      return conn.sendMessage(chat, { text: '✅ Bienvenida desactivada\n\n*CKV BOT*' }, { quoted: m })
    }
    return conn.sendMessage(chat, { text: '⚠️ Uso: .welcome <texto> o .welcome off\nUsa @user para mencionar' }, { quoted: m })
  }

  global.db.config.welcome[chat] = text
  conn.sendMessage(chat, { text: `✅ Mensaje de bienvenida activado\n\n*CKV BOT*` }, { quoted: m })
}
