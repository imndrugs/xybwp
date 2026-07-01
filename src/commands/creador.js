export default async function handler(conn, m) {

    const jid = m?.key?.remoteJid || m?.chat || m?.sender
    if (!jid) return

    return await conn.sendMessage(jid, {
        text: "👑 Mi creador es EzMe.\n📱 +52 564 444 4644"
    }, { quoted: m })

}