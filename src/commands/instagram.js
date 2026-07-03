import fetch from 'node-fetch'

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

  const apiKey = process.env.RAPIDAPI_KEY || "07f782a02dmshfe7cb2bc7497fbdp1ed662jsn34aaf6a6a338"
  const apiHost = "instagram120.p.rapidapi.com"

  try {
    const res = await fetch("https://instagram120.p.rapidapi.com/api/instagram/video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-host": apiHost,
        "x-rapidapi-key": apiKey
      },
      body: JSON.stringify({ url })
    })

    const json = await res.json()
    const videoUrl = json?.video_url || json?.url || json?.download_url || json?.video

    if (videoUrl) {
      await conn.sendMessage(jid, {
        video: { url: videoUrl },
        caption: "📥 Instagram reel descargado"
      }, { quoted: m })
      return
    }

    const imageUrl = json?.image_url || json?.image || json?.display_url || json?.thumbnail
    if (imageUrl) {
      await conn.sendMessage(jid, {
        image: { url: imageUrl },
        caption: "📥 Instagram descargado"
      }, { quoted: m })
      return
    }

    throw new Error("No se pudo obtener el contenido")
  } catch (e) {
    console.error("Instagram error:", e)
    return conn.sendMessage(jid, {
      text: "❌ Error descargando contenido de Instagram"
    }, { quoted: m })
  }
}
