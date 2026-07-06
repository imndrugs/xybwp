import axios from 'axios'

export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  const query = args.join(' ')
  if (!query) return conn.sendMessage(chat, { text: '⚠️ Uso: .letra <canción>' }, { quoted: m })

  try {
    const res = await axios.get(`https://api.lyrics.ovh/v1/${query.replace(/ /g, '+')}`, { timeout: 10000 })
    const lyrics = res?.data?.lyrics
    if (lyrics) {
      const text = lyrics.length > 4000 ? lyrics.slice(0, 4000) + '\n\n...' : lyrics
      conn.sendMessage(chat, { text: `🎵 *${query}*\n\n${text}\n\n*CKV BOT*` }, { quoted: m })
    } else {
      throw new Error('No encontrada')
    }
  } catch {
    conn.sendMessage(chat, { text: '❌ No encontré la letra' }, { quoted: m })
  }
}
