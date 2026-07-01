export default async function handler(conn, m) {

    const jid = m?.key?.remoteJid || m.chat || m.sender
    if (!jid) return

    return await conn.sendMessage(jid, {
        text: "Mi creador es EzMe, contactalo como @imndrugs en telegram"
    }, { quoted: m })

}