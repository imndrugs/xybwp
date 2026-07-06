import axios from 'axios'

export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  const text = args.join(' ')
  if (!text) return conn.sendMessage(chat, { text: '⚠️ Uso: .simi <mensaje>' }, { quoted: m })

  try {
    const res = await axios.get(`https://api.simsimi.vn/v1/simtalk`, {
      params: { text, lc: 'es' },
      timeout: 10000
    })
    const reply = res?.data?.message || 'No entendí'
    conn.sendMessage(chat, { text: `🤖 ${reply}` }, { quoted: m })
  } catch {
    conn.sendMessage(chat, { text: '❌ No pude conectar con Simi' }, { quoted: m })
  }
}
