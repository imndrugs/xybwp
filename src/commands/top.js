export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  const topic = args.join(' ') || 'cosas'
  const items = []
  for (let i = 1; i <= 10; i++) {
    items.push(`${i}. ${randomPhrase(topic)}`)
  }
  conn.sendMessage(chat, { text: `🏆 *Top 10 ${topic}*\n\n${items.join('\n')}\n\n*CKV BOT*` }, { quoted: m })
}

function randomPhrase(topic) {
  const templates = [
    `${topic} pero con estilo`,
    `${topic} versión mejorada`,
    `${topic} que todos quieren`,
    `${topic} legendario`,
    `${topic} sin igual`,
    `${topic} de la casa`,
    `${topic} premium`,
    `${topic} edición limitada`,
    `${topic} original`,
    `${topic} clásico`
  ]
  return templates[Math.floor(Math.random() * templates.length)]
}
