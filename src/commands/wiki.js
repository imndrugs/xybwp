import axios from 'axios'

export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  const query = args.join(' ')
  if (!query) return conn.sendMessage(chat, { text: '⚠️ Uso: .wiki <búsqueda>' }, { quoted: m })

  try {
    const res = await axios.get(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`, { timeout: 10000 })
    const data = res.data
    if (data?.title && data?.extract) {
      const text = `📚 *${data.title}*\n\n${data.extract.slice(0, 3000)}${data.extract.length > 3000 ? '...' : ''}\n\n🔗 ${data.content_urls?.desktop?.page || ''}\n\n*CKV BOT*`
      conn.sendMessage(chat, { text }, { quoted: m })
    } else {
      throw new Error('No encontrado')
    }
  } catch {
    conn.sendMessage(chat, { text: '❌ No encontré resultados' }, { quoted: m })
  }
}
