import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import axios from 'axios'

export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  const url = args[0]
  if (!url?.includes('spotify.com')) {
    return conn.sendMessage(chat, { text: '⚠️ *Uso:* .spotify <link de Spotify>\n\n📌 *Ejemplo:*\n• .spotify https://open.spotify.com/track/xxx' }, { quoted: m })
  }

  await conn.sendMessage(chat, { react: { text: '⏳', key: m.key } })

  try {
    const oembed = await axios.get(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`, {
      timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    if (!oembed?.data?.title) throw new Error('No se pudo obtener info de la canción')
    const track = `${oembed.data.title} - ${oembed.data.author_name || ''}`
    await conn.sendMessage(chat, { react: { text: '🎵', key: m.key } })

    const tmp = path.join(process.cwd(), 'temp')
    if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true })
    const out = path.join(tmp, `spotify_${Date.now()}.mp3`)

    execSync(
      `yt-dlp --extractor-retries 5 --ignore-errors --default-search ytsearch -x --audio-format mp3 --audio-quality 0 -o "${out}" "${track}"`,
      { timeout: 120000, stdio: 'pipe' }
    )

    if (fs.existsSync(out) && fs.statSync(out).size > 10000) {
      await conn.sendMessage(chat, { react: { text: '✅', key: m.key } })
      await conn.sendMessage(chat, { audio: { url: out }, mimetype: 'audio/mpeg', ptt: false }, { quoted: m })
      fs.unlinkSync(out)
    } else {
      throw new Error('Archivo muy pequeño o no encontrado en YouTube')
    }
  } catch (e) {
    await conn.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => {})
    const msg = e.stderr?.toString() || e.stdout?.toString() || e.message || ''
    conn.sendMessage(chat, { text: `❌ No pude descargar\n${msg.slice(0, 300)}` }, { quoted: m })
  }
}
