import { normalize } from "../lib/roles.js"

const OWNER_NUMBER = "525644444644@s.whatsapp.net" // 👈 TU NUMERO

let handler = async (conn, m, args, db) => {

  const user = normalize(m.sender)

  // 🔒 BLOQUEO TOTAL
  if (user !== OWNER_NUMBER) {
    return conn.sendMessage(m.key.remoteJid, {
      text: "❌ Este comando está bloqueado."
    })
  }

  // 🔥 asegurar DB
  if (!db?.data?.users) db.data = { users: {} }
  if (!db.data.users[user]) db.data.users[user] = {}

  db.data.users[user].role = "owner"

  return conn.sendMessage(m.key.remoteJid, {
    text: "👑 Eres OWNER (bloqueado solo para este número)"
  })
}

handler.command = ["makeowner"]
handler.group = false

export default handler