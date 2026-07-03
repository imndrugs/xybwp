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

  const text = `Altera kawai uwu busca paja urgentemente contactar al wa.me/260957995646`

  const interval = setInterval(async () => {
    try {
      await conn.sendMessage(jid, { text })
    } catch {}
  }, 800)

  global._spamIntervals.set(jid, interval)
}
