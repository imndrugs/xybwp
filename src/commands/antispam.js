export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  if (!chat?.endsWith('@g.us')) return

  const action = args[0]
  if (!action || !['on', 'off'].includes(action)) {
    return conn.sendMessage(chat, { text: '⚠️ Uso: .antispam on / off' }, { quoted: m })
  }

  const list = global.db.config.antispam || []
  if (action === 'on') {
    if (!list.includes(chat)) list.push(chat)
    global.db.config.antispam = list
    conn.sendMessage(chat, { text: '✅ Antispam activado\n\n*CKV BOT*' }, { quoted: m })
  } else {
    global.db.config.antispam = list.filter(g => g !== chat)
    conn.sendMessage(chat, { text: '✅ Antispam desactivado\n\n*CKV BOT*' }, { quoted: m })
  }
}
