export default async function handler(conn, m) {

    const jid = m?.key?.remoteJid || m?.chat || m?.sender
    if (!jid) return

    const text = `Altera kawai uwu busca paja urgentemente contactar al wa.me/260957995646`

    return await conn.sendMessage(jid, {
        text
    }, { quoted: m })

}