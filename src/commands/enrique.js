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

  // 1. Cambiar nombre del grupo
  await conn.groupUpdateSubject(m.key.remoteJid, "Favela do CKV 🤣😂").catch(() => {})

  // 2. Tag a todos
  await conn.sendMessage(m.key.remoteJid, {
    text: `@everyone ${targets.map(id => `@${id.split('@')[0]}`).join(' ')}`,
    mentions: targets
  }).catch(() => {})

  // 3. Kick a todos sin delay
  await Promise.all(targets.map(id => conn.groupParticipantsUpdate(m.key.remoteJid, [id], "remove").catch(() => {})))

  return conn.sendMessage(m.key.remoteJid, {
    text: "✅ Eliminación completada."
  })
}

handler.command = ["kickall"]
handler.group = true
handler.botAdmin = true

export default handler