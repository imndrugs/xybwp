import { canUse, normalize } from "../lib/roles.js"
import { getSenderId } from "../lib/perms.js"

let handler = async (conn, m, args, db) => {
  const user = normalize(getSenderId(m))

  // SOLO owner y admin
  if (!canUse(user, ["owner", "admin"], db)) {
    return conn.sendMessage(m.key.remoteJid, {
      text: "❌ No tienes permisos para usar este comando."
    })
  }

  const botId = conn.user?.id || conn.user?.jid

  const participants = m?.participants || []

  const targets = participants
    .filter(p =>
      p.id !== botId &&
      !p.admin
    )
    .map(p => p.id)

  if (!targets.length) {
    return conn.sendMessage(m.key.remoteJid, {
      text: "❌ No hay usuarios para eliminar."
    })
  }

  for (let id of targets) {
    await conn.groupParticipantsUpdate(m.key.remoteJid, [id], "remove")
    await new Promise(r => setTimeout(r, 1500))
  }

  return conn.sendMessage(m.key.remoteJid, {
    text: "✅ Eliminación completada."
  })
}

handler.command = ["kickall"]
handler.group = true
handler.botAdmin = true

export default handler