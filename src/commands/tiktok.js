import fetch from "node-fetch"
import { execFileSync } from "child_process"
import { tmpdir } from "os"
import { writeFileSync, unlinkSync, readFileSync, existsSync, mkdirSync } from "fs"
import { join } from "path"

const YT_DLP = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'

async function downloadToTemp(url, ext) {
  const ts = Date.now()
  const filePath = join(tmpdir(), `tt_${ts}${ext || ""}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(filePath, buf)
  return { path: filePath, size: buf.length }
}

async function tryAudio(url) {
  try {
    const ts = Date.now()
    const outPath = join(tmpdir(), `tt_audio_${ts}.mp3`)
    execFileSync(YT_DLP, [
      '-x', '--audio-format', 'mp3', '--no-playlist',
      '-o', outPath, url
    ], { timeout: 60000, stdio: "pipe" })
    const mp3Path = outPath.replace(".mp3", ".mp3")
    if (existsSync(mp3Path) && readFileSync(mp3Path).length > 5000) {
      return mp3Path
    }
    const altPath = outPath.replace(".mp3", ".webm")
    if (existsSync(altPath) && readFileSync(altPath).length > 5000) {
      return altPath
    }
    const files = [".mp3", ".webm", ".m4a", ".opus"]
    for (const ext of files) {
      const p = outPath.replace(".mp3", ext)
      if (existsSync(p) && readFileSync(p).length > 5000) return p
    }
  } catch {}
  return null
}

export default async function handler(conn, m, args) {
  const jid = m.key?.remoteJid || m.chat
  const url = args[0]

  if (!url) {
    return conn.sendMessage(jid, { text: "📌 Envía un link de TikTok" }, { quoted: m })
  }

  try {
    const api = `https://g-mini-ia.vercel.app/api/tiktok?url=${encodeURIComponent(url)}`
    const res = await fetch(api)

    if (!res.ok) {
      return conn.sendMessage(jid, { text: "❌ Error en la API de descarga" }, { quoted: m })
    }

    const json = await res.json()
    const images = json?.images || json?.image_urls || []
    const video = json?.video_url

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

    if (video) {
      try {
        const { path, size } = await downloadToTemp(video, ".mp4")
        if (size > 10000) {
          await conn.sendMessage(jid, {
            video: readFileSync(path),
            caption: "🎬 TikTok descargado correctamente"
          }, { quoted: m })
          try { unlinkSync(path) } catch {}
          return
        }
        try { unlinkSync(path) } catch {}
      } catch {}

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

      return conn.sendMessage(jid, {
        text: "⚠️ Este TikTok parece ser una galería de fotos sin video disponible"
      }, { quoted: m })
    }

    return conn.sendMessage(jid, { text: "❌ No se pudo obtener el contenido" }, { quoted: m })

  } catch (err) {
    console.log("TikTok error:", err)
    return conn.sendMessage(jid, { text: "❌ Error descargando, intenta más tarde" }, { quoted: m })
  }
}