// 👑 PON TU OWNER AQUÍ (SIN @lid, SOLO NÚMEROS)
// También puedes definirlo con OWNER_ID=numero1,numero2 al iniciar el bot.
const OWNER_IDS_RAW = (process.env.OWNER_ID || "116715954372809").split(",")

export const OWNER_IDS = OWNER_IDS_RAW.map((id) => clean(id)).filter(Boolean)

// 🧠 limpia cualquier formato de WhatsApp
export function clean(jid = "") {
  if (!jid) return ""

  let value = jid.toString().trim()

  if (!value) return ""

  if (value.startsWith("@")) {
    value = value.slice(1)
  }

  // quitar sufijos tipo @lid, @s.whatsapp.net, @g.us, etc.
  value = value.split("@")[0]
  value = value.replace(/:\d+/g, "")
  value = value.replace(/\D/g, "")

  return value
}

function collectCandidateIds(value) {
  const ids = []
  const stack = [value]

  while (stack.length) {
    const current = stack.pop()

    if (typeof current === "string") {
      const cleaned = clean(current)
      if (cleaned) ids.push(cleaned)
    } else if (Array.isArray(current)) {
      current.forEach((item) => stack.push(item))
    } else if (current && typeof current === "object") {
      Object.values(current).forEach((item) => stack.push(item))
    }
  }

  return ids
}

function isGroupJid(jid = "") {
  return /@g\.us$/i.test(jid) || jid.includes("-g.us")
}

// 👑 CHECK OWNER (FORZADO Y SEGURO)
export function isOwner(jid = "") {
  const ids = collectCandidateIds(jid)
  const normalizedIds = ids.filter(Boolean)

  console.log("RAW:", jid)
  console.log("CLEAN:", normalizedIds)
  console.log("OWNER:", OWNER_IDS)

  if (!normalizedIds.length || !OWNER_IDS.length) return false

  return normalizedIds.some((id) =>
    OWNER_IDS.some((ownerId) => {
      if (!ownerId) return false

      return (
        String(id) === String(ownerId) ||
        String(id).endsWith(String(ownerId)) ||
        String(ownerId).endsWith(String(id))
      )
    })
  )
}

export function getSenderId(m = {}) {
  const chatJid = m?.key?.remoteJid || m?.chat || ""
  const isGroup = isGroupJid(chatJid)

  const candidates = [
    m?.sender,
    m?.key?.participant,
    m?.participant,
    m?.author,
    m?.message?.extendedTextMessage?.contextInfo?.participant,
    isGroup ? "" : m?.key?.remoteJid,
    isGroup ? "" : m?.chat,
    m?.key?.fromMe ? m?.key?.remoteJid : ""
  ].filter(Boolean)

  for (const value of candidates) {
    const cleaned = clean(value)
    if (cleaned) return cleaned
  }

  const scanned = collectCandidateIds(m)
  return scanned.find(Boolean) || ""
}

// 🛡️ DB INIT
export function initDB(db) {
  if (!db?.data) db.data = {}
  if (!db.data.admins) db.data.admins = []
}