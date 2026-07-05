import fetch from "node-fetch"
import { execFileSync } from "child_process"
import { tmpdir } from "os"
import { writeFileSync, unlinkSync, readFileSync, existsSync, readdirSync } from "fs"
import { join } from "path"
import { socialkitDownload } from '../lib/socialkit.js'

const YT_DLP = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
const HAS_YTDLP = (() => {
  try { execFileSync(YT_DLP, ['--version'], { stdio: 'pipe' }); return true }
  catch { return false }
})()

async function resolveUrl(shortUrl) {
  try {
    const r = await fetch(shortUrl, { method: 'HEAD', redirect: 'follow', timeout: 10000 })
    return r.url || shortUrl
  } catch { return shortUrl }
}

function cleanTikTokUrl(url) {
  const idx = url.indexOf('?')
  if (idx !== -1) url = url.substring(0, idx)
  return url
}

function isValidMp4(filePath) {
  try {
    return readFileSync(filePath).slice(4, 8).toString() === 'ftyp'
  } catch { return false }
}

async function downloadToTemp(url, ext) {
  const ts = Date.now()
  const filePath = join(tmpdir(), `tt_${ts}${ext || ""}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(filePath, buf)
  return { path: filePath, size: buf.length }
}

function findFile(prefix, exts) {
  const dir = tmpdir()
  for (const f of readdirSync(dir).filter(f => f.startsWith(prefix))) {
    for (const ext of exts) {
      if (f.includes(ext.replace('.', '')) || f.endsWith(ext)) {
        try {
          const p = join(dir, f)
          if (readFileSync(p).length > 5000) return p
        } catch {}
      }
    }
  }
  return null
}

// ---- Scraper directo de la pagina de TikTok (fotos) ----
async function scrapeTikTokPage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(15000)
    })
    if (!res.ok) { console.log("Scraper HTTP", res.status); return null }
    const html = await res.text()

    // Buscar JSON en <script id="__NEXT_DATA__">
    const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/)
    const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/);
    const rawJson = nextMatch?.[1] || stateMatch?.[1]
    if (!rawJson) { console.log("Scraper: no se encontro JSON en pagina"); return null }

    let data
    try { data = JSON.parse(rawJson) } catch { console.log("Scraper: JSON invalido"); return null }

    // Navegar por la estructura del JSON de TikTok
    const videoData =
      data?.props?.pageProps?.videoData ||
      data?.props?.pageProps?.itemInfo?.itemStruct ||
      data?.__INITIAL_STATE__?.videoData ||
      data

    const images = []
    if (videoData?.imagePost?.images) {
      for (const img of videoData.imagePost.images) {
        const u = img?.imageURL?.urlList?.[0] || img?.imageURL || ''
        if (u) images.push(u)
      }
    }
    // Fallback: buscar displaySrc/imageSrc en el JSON
    if (!images.length) {
      const all = JSON.stringify(data)
      const regex = /"displaySrc"\s*:\s*"([^"]+)"/g
      let m
      while ((m = regex.exec(all)) !== null) {
        const decoded = m[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/')
        if (!images.includes(decoded)) images.push(decoded)
      }
    }

    const music = videoData?.music?.playUrl || videoData?.music?.audio?.url || ''
    const videoUrl = videoData?.video?.playAddr?.[0] || videoData?.video?.downloadAddr || ''

    if (images.length || videoUrl) {
      return { images, video: videoUrl, music }
    }

    console.log("Scraper: no se extrajo contenido")
    return null
  } catch (e) { console.log("Scraper error:", e.message); return null }
}
// ----

async function tryYtDlp(url) {
  try {
    const ts = Date.now()
    execFileSync(YT_DLP, [
      '-f', 'best', '--no-playlist',
      '-o', join(tmpdir(), `tt_vid_${ts}_%(ext)s`), url
    ], { timeout: 120000, stdio: "pipe" })
    return findFile(`tt_vid_${ts}`, ['.mp4', '.webm', '.mkv'])
  } catch (e) { console.log("yt-dlp video fail:", e.message) }
  return null
}

async function tryAudio(url) {
  try {
    const ts = Date.now()
    execFileSync(YT_DLP, [
      '-x', '--audio-format', 'mp3', '--no-playlist',
      '-o', join(tmpdir(), `tt_audio_${ts}_%(ext)s`), url
    ], { timeout: 60000, stdio: "pipe" })
    return findFile(`tt_audio_${ts}`, ['.mp3', '.webm', '.m4a', '.opus'])
  } catch {}
  return null
}

async function tryApi(url) {
  const apis = [
    `https://g-mini-ia.vercel.app/api/tiktok?url=${encodeURIComponent(url)}`,
    `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`,
  ]
  for (const api of apis) {
    try {
      const res = await fetch(api, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(15000)
      })
      if (!res.ok) { console.log(`API ${api.split('/')[2]} HTTP ${res.status}`); continue }
      const text = await res.text()
      let json
      try { json = JSON.parse(text) } catch { console.log(`API ${api.split('/')[2]}: JSON invalido`); continue }
      if (json.code === 0 && json.data) {
        const d = json.data
        return { images: d.images || [], video: d.play || d.wmplay || '', music: d.music || '' }
      }
      const images = json?.images || json?.image_urls || []
      const video = json?.video_url || json?.video || ''
      const music = json?.music?.playUrl || json?.music?.url || ''
      if (images.length || video) return { images, video, music }
      console.log(`API ${api.split('/')[2]}: sin datos utiles`)
    } catch (e) { console.log(`API ${api.split('/')[2]} error:`, e.message) }
  }
  return null
}

export default async function handler(conn, m, args) {
  const jid = m.key?.remoteJid || m.chat
  let url = args[0]
  if (!url) {
    return conn.sendMessage(jid, { text: "📌 Envía un link de TikTok" }, { quoted: m })
  }

  if (/vt\.tiktok\.com/i.test(url)) {
    url = await resolveUrl(url)
    console.log("URL resuelta:", url)
  }
  url = cleanTikTokUrl(url)
  console.log("URL final:", url)

  await conn.sendMessage(jid, { text: "⏬ Descargando..." }, { quoted: m })

  // --- 1) SocialKit ---
  const sk = await socialkitDownload('tiktok', url)
  if (sk?.images?.length) {
    for (let i = 0; i < sk.images.length; i++) {
      try {
        await conn.sendMessage(jid, { image: { url: sk.images[i] }, caption: `📸 TikTok foto ${i + 1}/${sk.images.length}` }, { quoted: m })
      } catch { console.log(`Error SocialKit img ${i+1}:`, sk.images[i]) }
    }
    if (sk.music) {
      try {
        const audio = await downloadToTemp(sk.music, ".mp3")
        if (audio.size > 5000) await conn.sendMessage(jid, { audio: readFileSync(audio.path), mimetype: "audio/mpeg" }, { quoted: m })
        try { unlinkSync(audio.path) } catch {}
      } catch {}
    }
    return
  }
  if (sk?.downloadUrl) {
    try {
      const f = await downloadToTemp(sk.downloadUrl, ".mp4")
      if (f.size > 10000 && isValidMp4(f.path)) {
        await conn.sendMessage(jid, { video: readFileSync(f.path), caption: "🎬 TikTok descargado" }, { quoted: m })
        try { unlinkSync(f.path) } catch {}; return
      }
      try { unlinkSync(f.path) } catch {}
    } catch { console.log("SocialKit video download fail") }
  }

  // --- 2) Scraper directo (fotos de TikTok) ---
  const scraped = await scrapeTikTokPage(url)
  if (scraped?.images?.length) {
    for (let i = 0; i < scraped.images.length; i++) {
      try {
        await conn.sendMessage(jid, { image: { url: scraped.images[i] }, caption: `📸 TikTok foto ${i + 1}/${scraped.images.length}` }, { quoted: m })
      } catch { console.log(`Error scraper img ${i+1}:`, scraped.images[i]) }
    }
    if (scraped.music) {
      try {
        const audio = await downloadToTemp(scraped.music, ".mp3")
        if (audio.size > 5000) await conn.sendMessage(jid, { audio: readFileSync(audio.path), mimetype: "audio/mpeg" }, { quoted: m })
        try { unlinkSync(audio.path) } catch {}
      } catch {}
    }
    return
  }
  if (scraped?.video) {
    try {
      const f = await downloadToTemp(scraped.video, ".mp4")
      if (f.size > 10000 && isValidMp4(f.path)) {
        await conn.sendMessage(jid, { video: readFileSync(f.path), caption: "🎬 TikTok descargado" }, { quoted: m })
        try { unlinkSync(f.path) } catch {}; return
      }
      try { unlinkSync(f.path) } catch {}
    } catch {}
  }

  // --- 3) yt-dlp for video ---
  if (HAS_YTDLP) {
    const ytPath = await tryYtDlp(url)
    if (ytPath) {
      try {
        await conn.sendMessage(jid, { video: readFileSync(ytPath), caption: "🎬 TikTok descargado" }, { quoted: m })
        try { unlinkSync(ytPath) } catch {}; return
      } catch { try { unlinkSync(ytPath) } catch {} }
    }
  }

  // --- 4) External APIs ---
  const apiData = await tryApi(url)
  if (apiData?.images?.length) {
    for (let i = 0; i < apiData.images.length; i++) {
      try {
        await conn.sendMessage(jid, { image: { url: apiData.images[i] }, caption: `📸 TikTok foto ${i + 1}/${apiData.images.length}` }, { quoted: m })
      } catch { console.log(`Error API img ${i+1}:`, apiData.images[i]) }
    }
    if (apiData.music) {
      try {
        const audio = await downloadToTemp(apiData.music, ".mp3")
        if (audio.size > 5000) await conn.sendMessage(jid, { audio: readFileSync(audio.path), mimetype: "audio/mpeg" }, { quoted: m })
        try { unlinkSync(audio.path) } catch {}
      } catch {}
    }
    return
  }
  if (apiData?.video) {
    try {
      const f = await downloadToTemp(apiData.video, ".mp4")
      if (f.size > 10000 && isValidMp4(f.path)) {
        await conn.sendMessage(jid, { video: readFileSync(f.path), caption: "🎬 TikTok descargado" }, { quoted: m })
        try { unlinkSync(f.path) } catch {}; return
      }
      try { unlinkSync(f.path) } catch {}
    } catch {}
  }

  // --- 5) Last resort: audio-only ---
  if (HAS_YTDLP) {
    const audioPath = await tryAudio(url)
    if (audioPath) {
      try {
        await conn.sendMessage(jid, { audio: readFileSync(audioPath), mimetype: "audio/mpeg" }, { quoted: m })
      } catch {}
      try { unlinkSync(audioPath) } catch {}
      return
    }
  }

  return conn.sendMessage(jid, { text: "❌ No se pudo descargar el contenido" }, { quoted: m })
}
