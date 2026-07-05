if (!global._spamIntervals) global._spamIntervals = new Map()

export default async function handler(conn, m) {
  const jid = m?.key?.remoteJid || m?.chat || m?.sender
  if (!jid) return

  if (global._spamIntervals.has(jid)) {
    return conn.sendMessage(jid, {
      text: '⚠️ Ya hay spam activo. Usa .pause para detenerlo.'
    }, { quoted: m })
  }

  await conn.sendMessage(jid, {
    text: '🔥 Spam iniciado. Usa .pause para detener.'
  }, { quoted: m })

  const text = `kira uwu jot em busca de paja liga na call wa.me/525612222222`

  const interval = setInterval(async () => {
    try {
      await conn.sendMessage(jid, { text })
    } catch {}
  }, 600)

  global._spamIntervals.set(jid, interval)
}
