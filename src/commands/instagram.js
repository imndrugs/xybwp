import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import fetch from 'node-fetch'

const execFileAsync = promisify(execFile)
const COOKIE_PATH = 'src/instagram_cookies.txt'
const TEMP_DIR = 'temp'
const YT_DLP = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true })

if (process.env.INSTAGRAM_COOKIES && !fs.existsSync(COOKIE_PATH)) {
  try { fs.writeFileSync(COOKIE_PATH, process.env.INSTAGRAM_COOKIES) } catch {}
}

function cleanUrl(raw) {
  return raw.replace(/\?.*/, '').replace(/\/$/, '')
}

async function tryYtDlp(url, useCookies = true) {
  if (useCookies && !fs.existsSync(COOKIE_PATH)) return null

  const baseArgs = useCookies ? ['--cookies', COOKIE_PATH] : []
  const variants = [
    [],
    ['--extractor-args', 'instagram:api=web'],
    ['--extractor-args', 'instagram:api=graphql'],
  ]
  const cleanedUrl = cleanUrl(url)
  let lastError = null

  for (const extraArgs of variants) {
    try {
      const info = await execFileAsync(YT_DLP, [
        ...baseArgs, ...extraArgs, '--dump-json', cleanedUrl
      ], { timeout: 30000 })
      const data = JSON.parse(info.stdout)
      const isVideo = data.formats && data.formats.some(f => f.vcodec && f.vcodec !== 'none')
      const outputPath = path.join(TEMP_DIR, `ig_${data.id}.%(ext)s`)

      if (isVideo) {
        await execFileAsync(YT_DLP, [
          ...baseArgs, ...extraArgs, '-f', 'bestvideo+bestaudio',
          '--merge-output-format', 'mp4',
          '-o', outputPath, cleanedUrl
        ], { timeout: 120000 })
        const filePath = path.join(TEMP_DIR, `ig_${data.id}.mp4`)
        return { type: 'video', path: filePath }
      }

      // Single image — use the thumbnail as fallback
      const imgUrl = data.thumbnail
      if (imgUrl) {
        const resp = await fetch(imgUrl)
        const buf = Buffer.from(await resp.arrayBuffer())
        const filePath = path.join(TEMP_DIR, `ig_${data.id}${path.extname(imgUrl) || '.jpg'}`)
        fs.writeFileSync(filePath, buf)
        return { type: 'image', path: filePath }
      }
    } catch (e) {
      lastError = e
    }
  }

  throw lastError || new Error('Instagram: todas las variantes fallaron')
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

  const attempts = [
    { fn: () => tryYtDlp(raw, false), label: 'sin cookies' },
    { fn: () => tryYtDlp(raw, true), label: 'con cookies' },
  ]

  for (const { fn, label } of attempts) {
    try {
      const result = await fn()
      if (!result) continue

      if (result.type === 'video') {
        await conn.sendMessage(jid, {
          video: fs.readFileSync(result.path),
          caption: "📥 Instagram reel descargado"
        }, { quoted: m })
      } else {
        await conn.sendMessage(jid, {
          image: fs.readFileSync(result.path),
          caption: "📥 Instagram descargado"
        }, { quoted: m })
      }
      try { fs.unlinkSync(result.path) } catch {}
      return
    } catch (e) {
      console.log(`IG falló (${label}):`, e.message)
    }
  }

  return conn.sendMessage(jid, {
    text: "❌ No se pudo descargar. El reel puede ser privado o requerir cookies. Usa .igcookies para actualizar."
  }, { quoted: m })
}
