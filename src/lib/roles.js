import { clean, isOwner } from "./perms.js"

export function normalize(jid = "") {
  return clean(jid)
}

export function canUse(jid = "", roles = [], db) {
  const id = normalize(jid)
  if (!id) return false

  if (roles.includes("owner") && isOwner(id)) return true

  if (roles.includes("admin") && Array.isArray(db?.data?.admins)) {
    return db.data.admins.some((adminId) => normalize(adminId) === id)
  }

  return false
}
