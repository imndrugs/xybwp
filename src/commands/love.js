export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  if (!chat?.endsWith('@g.us')) return

  const participants = await conn.groupMetadata(chat).then(m => m.participants.map(p => p.id)).catch(() => [])
  if (participants.length < 2) return conn.sendMessage(chat, { text: '⚠️ No hay suficientes miembros' }, { quoted: m })

  const p1 = participants[Math.floor(Math.random() * participants.length)]
  let p2 = participants[Math.floor(Math.random() * participants.length)]
  while (p2 === p1) p2 = participants[Math.floor(Math.random() * participants.length)]

  const percent = Math.floor(Math.random() * 101)
  const hearts = percent > 75 ? '💞' : percent > 50 ? '💗' : percent > 25 ? '💔' : '💀'

  conn.sendMessage(chat, {
    text: `${hearts} *Compatibilidad de Amor* ${hearts}\n\n@${p1.split('@')[0]}\n💕\n@${p2.split('@')[0]}\n\n*${percent}%* ${percent > 70 ? '🔥 Perfectos!' : percent > 50 ? '✨ Puede funcionar' : '😬 Mejor ni intentarlo'}`,
    mentions: [p1, p2]
  }, { quoted: m })
}
