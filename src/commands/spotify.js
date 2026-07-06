import axios from 'axios'

export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  const url = args[0]
  if (!url?.includes('spotify.com')) {
    return conn.sendMessage(chat, { text: '⚠️ Uso: .spotify <link de Spotify>' }, { quoted: m })
  }

  await conn.sendMessage(chat, { text: '⏳ Descargando...' }, { quoted: m })

  try {
    const res = await axios.get(`https://api.spotify-download.com/v1/spotify?url=${encodeURIComponent(url)}`, { timeout: 20000 })
    const audioUrl = res?.data?.url || res?.data?.download || res?.data?.audio
    if (audioUrl) {
      await conn.sendMessage(chat, { audio: { url: audioUrl }, mimetype: 'audio/mpeg' }, { quoted: m })
    } else {
      throw new Error('No se encontró audio')
    }
  } catch {
    conn.sendMessage(chat, { text: '❌ No pude descargar la canción' }, { quoted: m })
  }
}
