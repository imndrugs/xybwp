export default async function handler(conn, m) {

    const start = Date.now()

    const jid = m?.key?.remoteJid || m.chat || m.sender
    if (!jid) return

    // mensaje único
    const sent = await conn.sendMessage(jid, {
        text: "🏓 Calculando ping..."
    }, { quoted: m })

    const latency = Date.now() - start

    await conn.sendMessage(jid, {
        text: `🏓 Pong!\n⚡ Velocidad: ${latency} ms`
    }, { quoted: m, edit: sent.key })
}