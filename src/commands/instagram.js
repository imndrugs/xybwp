import fetch from 'node-fetch'

async function tryApi1(url) {
  const res = await fetch(`https://instagram-downloader-download-instagram-videos-stories.p.rapidapi.com/index?url=${encodeURIComponent(url)}`, {
    headers: {
      "x-rapidapi-key": process.env.RAPIDAPI_KEY || "07f782a02dmshfe7cb2bc7497fbdp1ed662jsn34aaf6a6a338",
      "x-rapidapi-host": "instagram-downloader-download-instagram-videos-stories.p.rapidapi.com"
    }
  })
  const json = await res.json()
  return json?.media || json?.video || json?.download_url || json?.url || json?.image || null
}

async function tryApi2(url) {
  const res = await fetch(`https://api.akuari.my.id/downloader/instagram?link=${encodeURIComponent(url)}`)
  const json = await res.json()
  return json?.result?.video?.[0] || json?.result?.image?.[0] || json?.url || json?.video || null
}

async function tryApi3(url) {
  const res = await fetch(`https://restapi.akuari.my.id/downloader/instagram?link=${encodeURIComponent(url)}`)
  const json = await res.json()
  return json?.result?.video?.[0] || json?.result?.image?.[0] || json?.url || json?.video || json?.data?.url || null
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

  const apis = [tryApi1, tryApi2, tryApi3]
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
    } catch {}
  }

  return conn.sendMessage(jid, {
    text: "❌ No se pudo descargar el contenido de Instagram. Verifica que el link sea válido."
  }, { quoted: m })
}
