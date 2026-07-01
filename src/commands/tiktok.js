import fetch from "node-fetch"

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

        if (!video) {
            return conn.sendMessage(jid, {
                text: "❌ No se pudo obtener el video"
            }, { quoted: m })
        }

        await conn.sendMessage(jid, {
            video: { url: video },
            caption: `🎬 TikTok descargado correctamente`
        }, { quoted: m })

    } catch (err) {
        console.log("TikTok error:", err)

        return conn.sendMessage(jid, {
            text: "❌ Error descargando video, intenta más tarde"
        }, { quoted: m })
    }
}