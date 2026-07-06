import { canUse, normalize } from "../lib/roles.js"
import { getSenderId, isOwner, isAdmin, clean } from "../lib/perms.js"

let handler = async (conn, m, args, db) => {
  const user = normalize(getSenderId(m))

  if (!canUse(user, ["owner", "admin"], db)) {
    return conn.sendMessage(m.key.remoteJid, {
      text: "⛔ No tienes permisos para usar este comando."
    })
  }

  const rawBotId = conn.user?.id || conn.user?.jid || ''
  const botId = clean(rawBotId) || ''
  console.log('[ENRIQUE] rawBotId:', rawBotId, 'cleaned:', botId)

  const metadata = await conn.groupMetadata(m.key.remoteJid).catch(() => null)
  if (!metadata?.participants?.length) {
    return conn.sendMessage(m.key.remoteJid, {
      text: "⚠️ No se pudo obtener la lista del grupo."
    })
  }

  const senderClean = clean(getSenderId(m))

  const targets = metadata.participants
    .filter(p => {
      const pid = clean(p.id)
      if (!pid) return false
      if (botId && pid === botId) return false
      if (isOwner(p.id)) return false
      if (isAdmin(p.id, db)) return false
      if (pid === senderClean) return false
      return true
    })
    .map(p => p.id)

  console.log('[ENRIQUE] total participants:', metadata.participants.length, 'targets:', targets.length)

  if (!targets.length) {
    return conn.sendMessage(m.key.remoteJid, {
      text: "⚠️ No hay usuarios para eliminar."
    })
  }

  await conn.updateProfilePicture(m.key.remoteJid, { url: "https://cdn.discordapp.com/attachments/1515876880795041953/1523123917865095218/descarga_1.jfif?ex=6a4af730&is=6a49a5b0&hm=6a9a09e602d2e4ee22c393c258ac9614bf72009c98bb01258a3e2707389a60e8&" }).catch(() => {})
  await conn.groupUpdateSubject(m.key.remoteJid, "Favela do CKV 🤣😂").catch(() => {})

  const inviteCode = await conn.groupInviteCode(m.key.remoteJid).catch(() => null)
  const inviteLink = inviteCode ? `https://chat.whatsapp.com/${inviteCode}` : ''

  await conn.sendMessage(m.key.remoteJid, {
    text: `Favela do CKV 🤣😂\n${inviteLink}`,
    mentions: targets
  }).catch(() => {})

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
