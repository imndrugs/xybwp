import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  const url = args[0]
  if (!url?.includes('spotify.com')) {
    return conn.sendMessage(chat, { text: '⚠️ *Uso:* .spotify <link de Spotify>\n\n📌 *Ejemplo:*\n• .spotify https://open.spotify.com/track/xxx' }, { quoted: m })
  }

  await conn.sendMessage(chat, { text: '⏳ Descargando...' }, { quoted: m })

  const tmp = path.join(process.cwd(), 'temp')
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true })
  const out = path.join(tmp, `spotify_${Date.now()}.mp3`)

  const cookiesFile = path.join(process.cwd(), 'src', 'youtube_cookies.txt')
  const cookiesArg = fs.existsSync(cookiesFile) ? `--cookies "${cookiesFile}"` : ''

  try {
    execSync(
      `yt-dlp ${cookiesArg} --js-runtimes deno -x --audio-format mp3 --audio-quality 0 -o "${out}" "${url}"`,
      { timeout: 120000, stdio: 'pipe' }
    )

    if (fs.existsSync(out) && fs.statSync(out).size > 10000) {
      await conn.sendMessage(chat, {
        audio: { url: out },
        mimetype: 'audio/mpeg',
        ptt: false
      }, { quoted: m })
      fs.unlinkSync(out)
    } else {
      throw new Error('Archivo muy pequeño')
    }
  } catch (e) {
    conn.sendMessage(chat, { text: `❌ No pude descargar la canción\n• ${e.message?.slice(0, 100)}` }, { quoted: m })
    try { fs.unlinkSync(out) } catch {}
  }
}
