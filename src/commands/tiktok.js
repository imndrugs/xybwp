import fetch from "node-fetch"
import { execFileSync } from "child_process"
import { tmpdir } from "os"
import { writeFileSync, unlinkSync, readFileSync, existsSync, readdirSync } from "fs"
import { join } from "path"

const YT_DLP = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
const HAS_YTDLP = (() => {
  try { execFileSync(YT_DLP, ['--version'], { stdio: 'pipe' }); return true }
  catch { return false }
})()

function isValidMp4(filePath) {
  try {
    const buf = readFileSync(filePath).slice(4, 8)
    return buf.toString() === 'ftyp'
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
  const files = readdirSync(dir).filter(f => f.startsWith(prefix))
  for (const f of files) {
    for (const ext of exts) {
      if (f.includes(ext.replace('.', '')) || f.endsWith(ext)) {
        const p = join(dir, f)
        try {
          if (readFileSync(p).length > 5000) return p
        } catch {}
      }
    }
  }
  return null
}

async function tryYtDlp(url) {
  try {
    const ts = Date.now()
    const outTemplate = join(tmpdir(), `tt_vid_${ts}_%(ext)s`)
    execFileSync(YT_DLP, [
      '-f', 'bestvideo+bestaudio', '--merge-output-format', 'mp4',
      '--no-playlist', '-o', outTemplate, url
    ], { timeout: 120000, stdio: "pipe" })
    return findFile(`tt_vid_${ts}`, ['.mp4', '.webm', '.mkv'])
  } catch (e) { console.log("yt-dlp video fail:", e.message) }
  return null
}

async function tryAudio(url) {
  try {
    const ts = Date.now()
    const outPath = join(tmpdir(), `tt_audio_${ts}_%(ext)s`)
    execFileSync(YT_DLP, [
      '-x', '--audio-format', 'mp3', '--no-playlist',
      '-o', outPath, url
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
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      })
      if (!res.ok) { console.log(`API ${api.split('/')[2]} returned ${res.status}`); continue }
      const text = await res.text()
      let json
      try { json = JSON.parse(text) } catch { continue }

      // tikwm format
      if (json.code === 0 && json.data) {
        const d = json.data
        const images = d.images || []
        const video = d.play || d.wmplay || ''
        const music = d.music || ''
        return { images, video, music }
      }

      // g-mini-ia format
      const images = json?.images || json?.image_urls || []
      const video = json?.video_url || ''
      const music = json?.music?.playUrl || json?.music?.url || ''
      return { images, video, music }
    } catch (e) { console.log(`API ${api.split('/')[2]} error:`, e.message) }
  }
  return null
}

export default async function handler(conn, m, args) {
  const jid = m.key?.remoteJid || m.chat
  const url = args[0]

  if (!url) {
    return conn.sendMessage(jid, { text: "📌 Envía un link de TikTok" }, { quoted: m })
  }

  await conn.sendMessage(jid, { text: "⏬ Descargando..." }, { quoted: m })

  // --- 1) Try yt-dlp for video ---
  let ytPath = null
  if (HAS_YTDLP) ytPath = await tryYtDlp(url)
  if (ytPath) {
    try {
      await conn.sendMessage(jid, {
        video: readFileSync(ytPath),
        caption: "🎬 TikTok descargado"
      }, { quoted: m })
      try { unlinkSync(ytPath) } catch {}
      return
    } catch { try { unlinkSync(ytPath) } catch {} }
  }

  // --- 2) Try APIs ---
  const apiData = await tryApi(url)
  if (apiData) {
    const { images, video, music } = apiData

    // Images case: send photos + audio
    if (images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        await conn.sendMessage(jid, {
          image: { url: images[i] },
          caption: `📸 TikTok foto ${i + 1}/${images.length}`
        }, { quoted: m })
      }
      if (music) {
        try {
          const audio = await downloadToTemp(music, ".mp3")
          if (audio.size > 5000) {
            await conn.sendMessage(jid, {
              audio: readFileSync(audio.path),
              mimetype: "audio/mpeg"
            }, { quoted: m })
          }
          try { unlinkSync(audio.path) } catch {}
        } catch { console.log("audio download fail") }
      } else if (HAS_YTDLP) {
        const audioPath = await tryAudio(url)
        if (audioPath) {
          try {
            await conn.sendMessage(jid, {
              audio: readFileSync(audioPath),
              mimetype: "audio/mpeg"
            }, { quoted: m })
          } catch {}
          try { unlinkSync(audioPath) } catch {}
        }
      }
      return
    }

    // Video case
    if (video) {
      const { path, size } = await downloadToTemp(video, ".mp4")
      if (size > 10000 && isValidMp4(path)) {
        await conn.sendMessage(jid, {
          video: readFileSync(path),
          caption: "🎬 TikTok descargado"
        }, { quoted: m })
        try { unlinkSync(path) } catch {}
        return
      }
      try { unlinkSync(path) } catch {}
    }
  }

  // --- 3) Last resort: audio-only ---
  if (HAS_YTDLP) {
    const audioPath = await tryAudio(url)
    if (audioPath) {
      try {
        await conn.sendMessage(jid, {
          audio: readFileSync(audioPath),
          mimetype: "audio/mpeg"
        }, { quoted: m })
      } catch {}
      try { unlinkSync(audioPath) } catch {}
      return
    }
  }

  return conn.sendMessage(jid, { text: "❌ No se pudo descargar el contenido" }, { quoted: m })
}
