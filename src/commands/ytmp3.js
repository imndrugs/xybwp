import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  const url = args[0]
  if (!url?.includes('youtube.com') && !url?.includes('youtu.be')) {
    return conn.sendMessage(chat, { text: '⚠️ Uso: .ytmp3 <link de YouTube>' }, { quoted: m })
  }

  await conn.sendMessage(chat, { text: '⏳ Descargando audio...' }, { quoted: m })

  const tmp = path.join(process.cwd(), 'temp')
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true })
  const out = path.join(tmp, `yt_${Date.now()}.mp3`)

  try {
    execSync(`yt-dlp -x --audio-format mp3 -o "${out}" "${url}"`, { timeout: 60000, stdio: 'pipe' })
    if (fs.existsSync(out)) {
      await conn.sendMessage(chat, { audio: { url: out }, mimetype: 'audio/mpeg' }, { quoted: m })
      fs.unlinkSync(out)
    }
  } catch (e) {
    conn.sendMessage(chat, { text: `❌ Error: ${e.message}` }, { quoted: m })
    try { fs.unlinkSync(out) } catch {}
  }
}
