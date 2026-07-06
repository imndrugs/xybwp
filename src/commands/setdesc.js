export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  if (!chat?.endsWith('@g.us')) return

  const desc = args.join(' ')
  if (!desc) return conn.sendMessage(chat, { text: '⚠️ Uso: .setdesc <descripción>' }, { quoted: m })

  await conn.groupUpdateDescription(chat, desc)
  conn.sendMessage(chat, { text: `✅ Descripción actualizada\n\n*CKV BOT*` }, { quoted: m })
}
