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

async function getImagesFromPage(url, cookies) {
  try {
    const cookieHeader = cookies || ''
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cookie': cookieHeader
      }
    })
    const html = await res.text()
    const images = []
    const displayUrlRegex = /"display_url"\s*:\s*"([^"]+)"/g
    let match
    while ((match = displayUrlRegex.exec(html)) !== null) {
      const imgUrl = match[1].replace(/\\u0026/g, '&')
      if (imgUrl.startsWith('https://') && !images.includes(imgUrl)) {
        images.push(imgUrl)
      }
    }
    return images
  } catch {
    return []
  }
}

function getCookiesFromFile() {
  try {
    if (!fs.existsSync(COOKIE_PATH)) return ''
    const content = fs.readFileSync(COOKIE_PATH, 'utf8')
    return content.split('\n')
      .filter(l => l && !l.startsWith('#'))
      .map(l => {
        const parts = l.split('\t')
        if (parts.length >= 7) return `${parts[5]}=${parts[6]}`
        return null
      })
      .filter(Boolean)
      .join('; ')
  } catch {
    return ''
  }
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

      if (data._type === 'playlist' && data.playlist_count > 0) {
        return { type: 'carousel', count: data.playlist_count, data }
      }

      const isVideo = data.formats && data.formats.some(f => f.vcodec && f.vcodec !== 'none')

      if (isVideo) {
        const ts = Date.now()
        const outputPath = path.join(TEMP_DIR, `ig_${ts}.%(ext)s`)
        await execFileAsync(YT_DLP, [
          ...baseArgs, ...extraArgs, '-f', 'bestvideo+bestaudio',
          '--merge-output-format', 'mp4',
          '-o', outputPath, cleanedUrl
        ], { timeout: 120000 })
        const filePath = path.join(TEMP_DIR, `ig_${ts}.mp4`)
        if (fs.existsSync(filePath) && fs.statSync(filePath).size > 10000) {
          return { type: 'video', path: filePath }
        }
        try { fs.unlinkSync(filePath) } catch {}
        return { type: 'image', url: data.thumbnail }
      }

      if (data.thumbnail) {
        return { type: 'image', url: data.thumbnail }
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

  if (!/^https?:\/\/(www\.)?instagram\.com\//i.test(raw.trim())) {
    return conn.sendMessage(jid, {
      text: '❌ Solo se aceptan enlaces de instagram.com'
    }, { quoted: m })
  }

  await conn.sendMessage(jid, { text: "⏬ Descargando..." }, { quoted: m })

  const attempts = [
    { fn: () => tryYtDlp(raw, false), label: 'sin cookies' },
    { fn: () => tryYtDlp(raw, true), label: 'con cookies' },
  ]

  for (const { fn, label } of attempts) {
    try {
      const result = await fn()
      if (!result) continue

      if (result.type === 'video') {
        const buffer = fs.readFileSync(result.path)
        await conn.sendMessage(jid, {
          video: buffer,
          caption: "📥 Instagram reel descargado"
        }, { quoted: m })
        try { fs.unlinkSync(result.path) } catch {}
        return
      }

      if (result.type === 'carousel') {
        const cookies = getCookiesFromFile()
        const pageImages = await getImagesFromPage(raw, cookies)

        if (pageImages.length > 0) {
          for (let i = 0; i < pageImages.length; i++) {
            await conn.sendMessage(jid, {
              image: { url: pageImages[i] },
              caption: `📸 Instagram foto ${i + 1}/${pageImages.length}`
            }, { quoted: m })
          }
          return
        }

        for (let i = 0; i < result.count; i++) {
          await conn.sendMessage(jid, {
            text: `📸 Instagram foto ${i + 1}/${result.count} (no se pudo descargar la imagen)`
          }, { quoted: m })
        }
        return
      }

      if (result.type === 'image') {
        await conn.sendMessage(jid, {
          image: { url: result.url },
          caption: "📥 Instagram descargado"
        }, { quoted: m })
        return
      }
    } catch (e) {
      console.log(`IG falló (${label}):`, e.message)
    }
  }

  return conn.sendMessage(jid, {
    text: "❌ No se pudo descargar. El reel puede ser privado o requerir cookies. Usa .igcookies para actualizar."
  }, { quoted: m })
}