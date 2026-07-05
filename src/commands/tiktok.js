import fetch from "node-fetch"
import { execFileSync } from "child_process"
import { tmpdir } from "os"
import { writeFileSync, unlinkSync, readFileSync, existsSync, readdirSync } from "fs"
import { join } from "path"

const YT_DLP = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'

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
      if (f.endsWith(ext)) {
        const p = join(dir, f)
        if (readFileSync(p).length > 5000) return p
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
    const p = findFile(`tt_vid_${ts}`, ['.mp4', '.webm', '.mkv'])
    if (p) return p
  } catch {}
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

export default async function handler(conn, m, args) {
  const jid = m.key?.remoteJid || m.chat
  const url = args[0]

  if (!url) {
    return conn.sendMessage(jid, { text: "📌 Envía un link de TikTok" }, { quoted: m })
  }

  await conn.sendMessage(jid, { text: "⏬ Descargando..." }, { quoted: m })

  // --- 1) Try yt-dlp for video ---
  const ytPath = await tryYtDlp(url)
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

  // --- 2) Try external API ---
  try {
    const api = `https://g-mini-ia.vercel.app/api/tiktok?url=${encodeURIComponent(url)}`
    const res = await fetch(api)
    if (!res.ok) throw new Error(`API ${res.status}`)
    const json = await res.json()
    const images = json?.images || json?.image_urls || []
    const video = json?.video_url

    // Images case: send photos + audio
    if (images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        await conn.sendMessage(jid, {
          image: { url: images[i] },
          caption: `📸 TikTok foto ${i + 1}/${images.length}`
        }, { quoted: m })
      }
      const audioUrl = json?.music?.playUrl || json?.music?.url
      if (audioUrl) {
        try {
          const audio = await downloadToTemp(audioUrl, ".mp3")
          if (audio.size > 5000) {
            await conn.sendMessage(jid, {
              audio: readFileSync(audio.path),
              mimetype: "audio/mpeg"
            }, { quoted: m })
          }
          try { unlinkSync(audio.path) } catch {}
        } catch {}
      } else {
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

    // Video case from API
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
  } catch (err) {
    console.log("TikTok API error:", err)
  }

  // --- 3) Last resort: audio-only ---
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

  return conn.sendMessage(jid, { text: "❌ No se pudo descargar el contenido" }, { quoted: m })
}
