import { OWNER_IDS } from "../lib/perms.js"

function normalize(jid) {
  if (!jid) return ''
  return jid.split('@')[0].split(':')[0] + '@s.whatsapp.net'
}

function getName(db, jid) {
  const key = normalize(jid)
  return db.contacts?.[key] || key.split('@')[0]
}

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ""
  const admins = db?.data?.admins || []

  const ownerNumber = OWNER_IDS[0] || ""
  const ownerName = getName(db, ownerNumber)
  const adminList = admins.map((admin) => getName(db, admin)).filter(Boolean)

  let text = `👑 ROLES\n\n👤 OWNER\n${ownerName || "sin configurar"}\n\n🛡️ ADMINISTRADORES\n${adminList.length ? adminList.join("\n") : "Ninguno"}`

  return conn.sendMessage(jid, { text }, { quoted: m })
}