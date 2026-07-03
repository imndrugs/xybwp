import fetch from 'node-fetch'

async function tryInstasave(url) {
  const res = await fetch("https://instasave.io/api/v1/convert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url })
  })
  const json = await res.json()
  return json?.video || json?.image || json?.media?.[0]?.url || json?.url || json?.download_url || null
}

async function tryRapid(url) {
  const key = process.env.RAPIDAPI_KEY || "07f782a02dmshfe7cb2bc7497fbdp1ed662jsn34aaf6a6a338"
  const res = await fetch("https://instagram-downloader-download-instagram-videos-stories.p.rapidapi.com/index", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-rapidapi-key": key,
      "x-rapidapi-host": "instagram-downloader-download-instagram-videos-stories.p.rapidapi.com"
    },
    body: JSON.stringify({ url })
  })
  const json = await res.json()
  return json?.media || json?.video || json?.image || json?.url || json?.download_url || null
}

async function tryScrape(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } })
  const html = await res.text()
  const patterns = [
    /"video_url":"([^"]+)"/,
    /property="og:video"[^>]+content="([^"]+)"/,
    /"display_url":"([^"]+)"/,
    /"download_url":"([^"]+)"/
  ]
  for (const p of patterns) {
    const m = html.match(p)
    if (m) return m[1].replace(/\\u0026/g, "&")
  }
  return null
}

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ""
  const url = args[0]

  if (!url) {
    return conn.sendMessage(jid, {
      text: "📌 Envía un link de Instagram (reel, post, historia)"
    }, { quoted: m })
  }

  await conn.sendMessage(jid, {
    text: "⏬ Descargando contenido de Instagram..."
  }, { quoted: m })

  const apis = [tryScrape, tryInstasave, tryRapid]
  for (const api of apis) {
    try {
      const mediaUrl = await api(url)
      if (mediaUrl) {
        const isVideo = mediaUrl.match(/\.(mp4|mov|avi|webm)($|\?)/i)
        if (isVideo) {
          await conn.sendMessage(jid, {
            video: { url: mediaUrl },
            caption: "📥 Instagram reel descargado"
          }, { quoted: m })
        } else {
          await conn.sendMessage(jid, {
            image: { url: mediaUrl },
            caption: "📥 Instagram descargado"
          }, { quoted: m })
        }
        return
      }
    } catch (e) {
      console.log("IG API falló:", e.message)
    }
  }

  return conn.sendMessage(jid, {
    text: "❌ No se pudo descargar el contenido de Instagram. Verifica que el link sea válido."
  }, { quoted: m })
}
