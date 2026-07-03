import fetch from "node-fetch"
import { execSync } from "child_process"
import { tmpdir } from "os"
import { writeFileSync, unlinkSync, readFileSync } from "fs"
import { join } from "path"

export default async function handler(conn, m, args) {
  const jid = m.key?.remoteJid || m.chat
  const url = args[0]

  if (!url) {
    return conn.sendMessage(jid, {
      text: "📌 Envía un link de TikTok"
    }, { quoted: m })
  }

  try {
    const api = `https://g-mini-ia.vercel.app/api/tiktok?url=${encodeURIComponent(url)}`
    const res = await fetch(api)

    if (!res.ok) {
      return conn.sendMessage(jid, {
        text: "❌ Error en la API de descarga"
      }, { quoted: m })
    }

    const json = await res.json()
    const video = json?.video_url
    const images = json?.images || json?.image_urls || []

    if (images.length > 0) {
      for (const img of images) {
        await conn.sendMessage(jid, {
          image: { url: img },
          caption: "📸 TikTok descargado"
        }, { quoted: m })
      }
      return
    }

    if (video) {
      // Check if video is actually an image (some APIs return image as video)
      const headRes = await fetch(video, { method: "HEAD" })
      const contentType = headRes.headers.get("content-type") || ""

      if (contentType.startsWith("image/")) {
        await conn.sendMessage(jid, {
          image: { url: video },
          caption: "📸 TikTok descargado"
        }, { quoted: m })
      } else {
        await conn.sendMessage(jid, {
          video: { url: video },
          caption: "🎬 TikTok descargado correctamente"
        }, { quoted: m })
      }
      return
    }

    return conn.sendMessage(jid, {
      text: "❌ No se pudo obtener el contenido"
    }, { quoted: m })

  } catch (err) {
    console.log("TikTok error:", err)
    return conn.sendMessage(jid, {
      text: "❌ Error descargando, intenta más tarde"
    }, { quoted: m })
  }
}
