function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function getMemberName(conn, jid) {
  try {
    const name = await conn.getName(jid)
    if (name) return name
  } catch {}
  return jid.split('@')[0].slice(-8)
}

export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  const topic = args.join(' ') || 'cosas'

  const groupMetadata = await conn.groupMetadata(chat).catch(() => null)
  if (!groupMetadata) {
    return conn.sendMessage(chat, { text: '❌ Este comando solo funciona en grupos' }, { quoted: m })
  }

  const participants = groupMetadata.participants
  if (participants.length < 3) {
    return conn.sendMessage(chat, { text: '❌ No hay suficientes miembros en el grupo' }, { quoted: m })
  }

  const names = await Promise.all(
    participants.map(p => getMemberName(conn, p.id))
  )

  const withNames = participants.map((p, i) => ({ id: p.id, name: names[i] }))
  const shuffled = shuffle(withNames)
  const top = shuffled.slice(0, Math.min(10, shuffled.length))

  const lines = top.map((p, i) => `${i + 1}. ${p.name}`)
  conn.sendMessage(chat, { text: `🏆 *Top 10 ${topic}*\n\n${lines.join('\n')}\n\n*CKV BOT*` }, { quoted: m })
}
