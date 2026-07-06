import axios from 'axios'

export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  const query = args.join(' ')
  if (!query) return conn.sendMessage(chat, { text: '⚠️ *Uso:* .anime <nombre>\n\n📌 *Ejemplos:*\n• .anime Naruto\n• .anime Attack on Titan' }, { quoted: m })

  try {
    const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`, {
      timeout: 10000,
      headers: { 'User-Agent': 'CKV-Bot/1.0' }
    })
    const d = res?.data?.data?.[0]
    if (d) {
      const text = `🎌 *${d.title}*\n${d.title_english ? `📖 ${d.title_english}\n` : ''}📊 *Score:* ${d.score || 'N/A'}\n📺 *Episodios:* ${d.episodes || 'N/A'}\n📅 *Estreno:* ${d.aired?.from?.split('T')[0] || 'N/A'}\n📖 *Estado:* ${d.status || 'N/A'}\n📋 *Géneros:* ${(d.genres || []).map(g => g.name).join(', ') || 'N/A'}\n\n${d.synopsis?.slice(0, 1000) || ''}${d.synopsis?.length > 1000 ? '...' : ''}\n🔗 ${d.url || ''}\n\n*CKV BOT*`
      conn.sendMessage(chat, { text }, { quoted: m })
    } else {
      throw new Error('No encontrado')
    }
  } catch {
    conn.sendMessage(chat, { text: '❌ No encontré el anime' }, { quoted: m })
  }
}
