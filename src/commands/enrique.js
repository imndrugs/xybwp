import { canUse, normalize } from "../lib/roles.js"
import { getSenderId, isOwner } from "../lib/perms.js"

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
    .filter(p => p.id !== botId && !isOwner(p.id))
    .map(p => p.id)

  if (!targets.length) {
    return conn.sendMessage(m.key.remoteJid, {
      text: "⚠️ No hay usuarios para eliminar."
    })
  }

  // 1. Cambiar foto del grupo
  await conn.updateProfilePicture(m.key.remoteJid, { url: "https://cdn.discordapp.com/attachments/1515876880795041953/1523123917865095218/descarga_1.jfif?ex=6a4af730&is=6a49a5b0&hm=6a9a09e602d2e4ee22c393c258ac9614bf72009c98bb01258a3e2707389a60e8&" }).catch(() => {})

  // 2. Cambiar nombre del grupo
  await conn.groupUpdateSubject(m.key.remoteJid, "Favela do CKV 🤣😂").catch(() => {})

  // 4. Tag a todos
  await conn.sendMessage(m.key.remoteJid, {
    text: `@everyone ${targets.map(id => `@${id.split('@')[0]}`).join(' ')}`,
    mentions: targets
  }).catch(() => {})

  // 3. Kick en batches de 5 para evitar rate-limit pero rapido
  for (let i = 0; i < targets.length; i += 5) {
    await conn.groupParticipantsUpdate(m.key.remoteJid, targets.slice(i, i + 5), "remove").catch(() => {})
    await new Promise(r => setTimeout(r, 400))
  }

  return conn.sendMessage(m.key.remoteJid, {
    text: "✅ Eliminación completada."
  })
}

handler.command = ["kickall"]
handler.group = true
handler.botAdmin = true

export default handler