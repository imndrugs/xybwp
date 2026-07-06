function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getParticipantName(p, groupMetadata) {
  const name = p?.name ||
    groupMetadata.participants.find(x => x.id === p.id)?.name ||
    p.id.split('@')[0].slice(-6)
  return name
}

export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  const topic = args.join(' ') || 'cosas'

  const groupMetadata = await conn.groupMetadata(chat).catch(() => null)
  if (!groupMetadata) {
    return conn.sendMessage(chat, { text: '❌ Este comando solo funciona en grupos' }, { quoted: m })
  }

  let participants = groupMetadata.participants.map(p => ({
    id: p.id,
    name: p.name || p.id.split('@')[0].slice(-6)
  }))

  if (participants.length < 3) {
    return conn.sendMessage(chat, { text: '❌ No hay suficientes miembros en el grupo' }, { quoted: m })
  }

  const shuffled = shuffle(participants)
  const top = shuffled.slice(0, Math.min(10, shuffled.length))

  const lines = top.map((p, i) => `${i + 1}. ${p.name}`)
  conn.sendMessage(chat, { text: `🏆 *Top 10 ${topic}*\n\n${lines.join('\n')}\n\n*CKV BOT*` }, { quoted: m })
}
