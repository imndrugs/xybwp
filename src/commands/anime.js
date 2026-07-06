import axios from 'axios'

async function fetchJikan(query, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1&sfw`, {
        timeout: 15000,
        headers: { 'User-Agent': 'CKV-Bot/1.0' }
      })
      return res?.data?.data?.[0]
    } catch (e) {
      if (i < retries - 1) await new Promise(r => setTimeout(r, 1500))
    }
  }
  return null
}

export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  const query = args.join(' ')
  if (!query) return conn.sendMessage(chat, { text: '⚠️ *Uso:* .anime <nombre>\n\n📌 *Ejemplos:*\n• .anime Naruto\n• .anime Attack on Titan' }, { quoted: m })

  const d = await fetchJikan(query)
  if (d) {
    const text = `🎌 *${d.title}*\n${d.title_english ? `📖 ${d.title_english}\n` : ''}📊 *Score:* ${d.score || 'N/A'}\n📺 *Episodios:* ${d.episodes || 'N/A'}\n📅 *Estreno:* ${d.aired?.from?.split('T')[0] || 'N/A'}\n📖 *Estado:* ${d.status || 'N/A'}\n📋 *Géneros:* ${(d.genres || []).map(g => g.name).join(', ') || 'N/A'}\n\n${d.synopsis?.slice(0, 1000) || ''}${d.synopsis?.length > 1000 ? '...' : ''}\n🔗 ${d.url || ''}\n\n*CKV BOT*`
    conn.sendMessage(chat, { text }, { quoted: m })
  } else {
    conn.sendMessage(chat, { text: '❌ No encontré el anime. Intenta con el nombre en inglés o japonés.' }, { quoted: m })
  }
}
