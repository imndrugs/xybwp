import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  const url = args[0]
  if (!url?.includes('youtube.com') && !url?.includes('youtu.be')) {
    return conn.sendMessage(chat, { text: '⚠️ *Uso:* .ytmp3 <link de YouTube>\n\n📌 *Ejemplos:*\n• .ytmp3 https://youtu.be/xxx\n• .ytmp3 https://youtube.com/watch?v=xxx' }, { quoted: m })
  }

  await conn.sendMessage(chat, { text: '⏳ Descargando audio...' }, { quoted: m })

  const tmp = path.join(process.cwd(), 'temp')
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true })
  const out = path.join(tmp, `yt_${Date.now()}.mp3`)

  try {
    execSync(
      `yt-dlp --extractor-retries 5 --geo-bypass --ignore-errors -x --audio-format mp3 --audio-quality 0 -o "${out}" "${url}"`,
      { timeout: 120000, stdio: 'pipe' }
    )
    if (fs.existsSync(out) && fs.statSync(out).size > 5000) {
      await conn.sendMessage(chat, { audio: { url: out }, mimetype: 'audio/mpeg', ptt: false }, { quoted: m })
      fs.unlinkSync(out)
    } else {
      throw new Error('Audio muy pequeño o vacío')
    }
  } catch (e) {
    const msg = (e.stderr?.toString() || e.stdout?.toString() || e.message || '')
    if (msg.includes('Sign in') || msg.includes('login')) {
      conn.sendMessage(chat, { text: '❌ YouTube bloqueó la descarga.\n\n💡 Usa .ytcookies para subir cookies de YouTube:\n1. Chrome > extensión Get cookies.txt LOCALLY\n2. Ve a youtube.com, inicia sesión\n3. Exporta cookies\n4. Envía el .txt al chat y responde .ytcookies' }, { quoted: m })
    } else {
      const short = msg.slice(0, 300).trim() || 'desconocido'
      conn.sendMessage(chat, { text: `❌ Error\n${short}` }, { quoted: m })
    }
    try { fs.unlinkSync(out) } catch {}
  }
}
