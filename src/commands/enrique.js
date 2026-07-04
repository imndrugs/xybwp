import { canUse, normalize } from "../lib/roles.js"
import { getSenderId } from "../lib/perms.js"

let handler = async (conn, m, args, db) => {
  const user = normalize(getSenderId(m))

  // SOLO owner y admin
  if (!canUse(user, ["owner", "admin"], db)) {
    return conn.sendMessage(m.key.remoteJid, {
      text: "⛔ No tienes permisos para usar este comando."
    })
  }

  const botId = conn.user?.id || conn.user?.jid

  const metadata = await conn.groupMetadata(m.key.remoteJid).catch(() => null)
  if (!metadata?.participants?.length) {
    return conn.sendMessage(m.key.remoteJid, {
      text: "⚠️ No se pudo obtener la lista del grupo."
    })
  }

  const targets = metadata.participants
    .filter(p =>
      p.id !== botId &&
      !p.admin
    )
    .map(p => p.id)

  if (!targets.length) {
    return conn.sendMessage(m.key.remoteJid, {
      text: "⚠️ No hay usuarios para eliminar."
    })
  }

  const BATCH_SIZE = 5
  const DELAY_MS = 300
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE)
    await Promise.all(batch.map(id => conn.groupParticipantsUpdate(m.key.remoteJid, [id], "remove").catch(() => {})))
    if (i + BATCH_SIZE < targets.length) {
      await new Promise(r => setTimeout(r, DELAY_MS))
    }
  }

  return conn.sendMessage(m.key.remoteJid, {
    text: "✅ Eliminación completada."
  })
}

handler.command = ["kickall"]
handler.group = true
handler.botAdmin = true

export default handler