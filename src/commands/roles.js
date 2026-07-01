import { OWNER_IDS } from "../lib/perms.js"

function formatPhone(number = "") {
  const digits = String(number || "").replace(/\D/g, "")
  if (!digits) return ""

  if (digits.length === 12 && digits.startsWith("52")) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`
  }

  if (digits.length > 10) {
    return `+${digits}`
  }

  return digits
}

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ""
  const admins = db?.data?.admins || []

  const ownerNumber = formatPhone(OWNER_IDS[0] || "")
  const adminList = admins.map((admin) => formatPhone(admin)).filter(Boolean)

  let text = `📊 ROLES\n\n`
  text += `👑 OWNER:\n- ${ownerNumber || "sin configurar"}\n\n`
  text += `🛡️ ADMINS:\n`
  text += adminList.length ? adminList.join("\n") : "- ninguno"

  return conn.sendMessage(jid, { text }, { quoted: m })
}