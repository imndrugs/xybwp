// 👑 PON TU OWNER AQUÍ (SIN @lid, SOLO NÚMEROS)
// Siempre incluye estos owners + los que estén en OWNER_ID env
const DEFAULT_OWNERS = ["116715954372809", "5256122222222"]
const ENV_OWNERS = process.env.OWNER_ID ? process.env.OWNER_ID.split(",") : []
const OWNER_IDS_RAW = [...new Set([...DEFAULT_OWNERS, ...ENV_OWNERS])]

export const OWNER_IDS = OWNER_IDS_RAW.map((id) => clean(id)).filter(Boolean)

// 🧠 limpia cualquier formato de WhatsApp
export function clean(jid = "") {
  if (!jid) return ""

  let value = jid.toString().trim()

  if (!value) return ""

  if (value.startsWith("@")) {
    value = value.slice(1)
  }

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

// 🛡️ CHECK ADMIN
export function isAdmin(sender, db) {
  if (!sender || !db?.data?.admins) return false
  const cleanSender = clean(sender)
  return db.data.admins.some(admin => clean(admin) === cleanSender)
}

// 🛡️ CHECK BANNED
export function isBanned(sender, db) {
  if (!sender || !db?.data?.banned) return false
  const cleanSender = clean(sender)
  return db.data.banned.some(bannedId => clean(bannedId) === cleanSender)
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
  if (!db.data.banned) db.data.banned = []
}