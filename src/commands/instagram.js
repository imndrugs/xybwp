import fetch from 'node-fetch'

async function tryRapid(url) {
  const res = await fetch("https://social-download-all-in-one.p.rapidapi.com/v1/social/autolink", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-rapidapi-key": process.env.RAPIDAPI_KEY || "07f782a02dmshfe7cb2bc7497fbdp1ed662jsn34aaf6a6a338",
      "x-rapidapi-host": "social-download-all-in-one.p.rapidapi.com"
    },
    body: JSON.stringify({ url })
  })
  const json = await res.json()
  return json?.video || json?.image || json?.media?.[0]?.url || json?.url || json?.download_url || null
}

async function tryAkuari(url) {
  const res = await fetch(`https://api.akuari.my.id/downloader/instagram?link=${encodeURIComponent(url)}`)
  const json = await res.json()
  return json?.result?.video?.[0] || json?.result?.image?.[0] || json?.url || json?.video || null
}

async function tryRestapi(url) {
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

  const apis = [tryRapid, tryAkuari, tryRestapi]
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
