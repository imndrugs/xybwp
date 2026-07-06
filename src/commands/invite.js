export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  if (!chat?.endsWith('@g.us')) return

  const code = await conn.groupInviteCode(chat)
  if (!code) return conn.sendMessage(chat, { text: '❌ No pude obtener el link' }, { quoted: m })

  conn.sendMessage(chat, { text: `🔗 Link del grupo:\nhttps://chat.whatsapp.com/${code}\n\n*CKV BOT*` }, { quoted: m })
}
