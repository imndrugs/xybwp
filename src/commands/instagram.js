import fetch from 'node-fetch'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

const execFileAsync = promisify(execFile)
const COOKIE_PATH = 'src/instagram_cookies.txt'
const TEMP_DIR = 'temp'
const YT_DLP = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true })

if (process.env.INSTAGRAM_COOKIES && !fs.existsSync(COOKIE_PATH)) {
  try { fs.writeFileSync(COOKIE_PATH, process.env.INSTAGRAM_COOKIES) } catch (e) { console.log('Error writing cookies:', e.message) }
}

function cleanUrl(raw) {
  return raw.replace(/\?.*/, '').replace(/\/$/, '')
}

async function tryYtDlp(url, useCookies = true) {
  if (useCookies && !fs.existsSync(COOKIE_PATH)) return null
  const args = useCookies ? ['--cookies', COOKIE_PATH] : []
  const info = await execFileAsync(YT_DLP, [
    ...args, '--dump-json', cleanUrl(url)
  ], { timeout: 30000 })
  const data = JSON.parse(info.stdout)
  const isVideo = data.formats && data.formats.some(f => f.vcodec && f.vcodec !== 'none')
  const outputPath = path.join(TEMP_DIR, `ig_${data.id}.%(ext)s`)

  if (isVideo) {
    await execFileAsync(YT_DLP, [
      ...args, '-f', 'bestvideo+bestaudio',
      '--merge-output-format', 'mp4',
      '-o', outputPath, cleanUrl(url)
    ], { timeout: 120000 })
    const filePath = path.join(TEMP_DIR, `ig_${data.id}.mp4`)
    return { type: 'video', path: filePath }
  }

  const imgUrl = data.thumbnail
  const ext = path.extname(new URL(imgUrl).pathname) || '.jpg'
  const filePath = path.join(TEMP_DIR, `ig_${data.id}${ext}`)
  const resp = await fetch(imgUrl)
  const buf = Buffer.from(await resp.arrayBuffer())
  fs.writeFileSync(filePath, buf)
  return { type: 'image', path: filePath }
}

async function trySocialKit(url) {
  const key = process.env.SOCIALKIT_KEY
  if (!key) return null
  try {
    const res = await fetch("https://api.socialkit.dev/instagram/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_key: key, url, format: "mp4", quality: "720p" })
    })
    if (!res.ok) return null
    const json = await res.json()
    const downloadUrl = json?.data?.downloadUrl
    if (!downloadUrl) return null
    const fileResp = await fetch(downloadUrl)
    const buf = Buffer.from(await fileResp.arrayBuffer())
    const filePath = path.join(TEMP_DIR, `ig_socialkit_${Date.now()}.mp4`)
    fs.writeFileSync(filePath, buf)
    return { type: 'video', path: filePath }
  } catch {
    return null
  }
}

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ""
  const raw = args[0]

  if (!raw) {
    return conn.sendMessage(jid, {
      text: "🔗 Envía un link de Instagram (reel, post, foto)"
    }, { quoted: m })
  }

  await conn.sendMessage(jid, {
    text: "⏬ Descargando..."
  }, { quoted: m })

  const apis = [
    () => tryYtDlp(raw, false),
    () => tryYtDlp(raw, true),
    trySocialKit
  ]
  for (const api of apis) {
    try {
      const result = await api(raw)
      if (result) {
        const caption = result.type === 'video'
          ? "📥 Instagram reel descargado"
          : "📥 Instagram descargado"
        if (result.type === 'video') {
          await conn.sendMessage(jid, {
            video: fs.readFileSync(result.path),
            caption
          }, { quoted: m })
        } else {
          await conn.sendMessage(jid, {
            image: fs.readFileSync(result.path),
            caption
          }, { quoted: m })
        }
        try { fs.unlinkSync(result.path) } catch {}
        return
      }
    } catch (e) {
      console.log("IG falló:", e.message)
    }
  }

  return conn.sendMessage(jid, {
    text: "❌ No se pudo descargar. Verifica que el link sea válido."
  }, { quoted: m })
}
