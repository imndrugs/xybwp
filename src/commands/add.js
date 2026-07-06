export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  if (!chat?.endsWith('@g.us')) return

  const target = args[0]
  if (!target) return conn.sendMessage(chat, { text: '⚠️ Uso: .add <número o @tag>' }, { quoted: m })

  let jid = target.replace(/[^0-9]/g, '')
  if (!jid) return conn.sendMessage(chat, { text: '⚠️ Número inválido' }, { quoted: m })
  jid = jid + '@s.whatsapp.net'

  await conn.groupParticipantsUpdate(chat, [jid], 'add')
  conn.sendMessage(chat, { text: `✅ @${jid.split('@')[0]} agregado\n\n*CKV BOT*` }, { quoted: m })
}
