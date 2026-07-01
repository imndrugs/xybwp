export default async function handler(conn, m) {

    const start = Date.now()

    const jid = m?.key?.remoteJid || m.chat || m.sender
    if (!jid) return

    // mensaje único
    const sent = await conn.sendMessage(jid, {
        text: "Mi Creador es EzMe, encuentralo en telegram como imndrugs"
    }, { quoted: m })

}