import { getSenderId } from '../lib/perms.js'
import fs from 'fs'
import path from 'path'

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''
  const sender = normalize(m.key?.participant || m.key?.remoteJid)

  if (!db.data) db.data = {}
  if (!db.data.afk) db.data.afk = {}

  const userKey = sender

  if (db.data.afk[userKey]) {
    const afkData = db.data.afk[userKey]
    const elapsed = Math.floor((Date.now() - afkData.since) / 1000)
    const mins = Math.floor(elapsed / 60)
    const secs = elapsed % 60
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`

    delete db.data.afk[userKey]

    try {
      const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'database.json'), 'utf8') || '{}')
      if (raw.data?.afk?.[userKey]) {
        delete raw.data.afk[userKey]
        fs.writeFileSync(path.join(process.cwd(), 'database.json'), JSON.stringify(raw, null, 2))
      }
    } catch {}

    return conn.sendMessage(jid, {
      text: `✨ Bienvenido de vuelta!\n\nEstuviste AFK durante ${timeStr}`
    }, { quoted: m })
  }

  const reason = args.length > 0 ? args.join(' ') : 'Sin motivo'
  const name = db.contacts?.[userKey] || m.pushName || userKey.split('@')[0]

  db.data.afk[userKey] = {
    name,
    reason,
    since: Date.now()
  }

  try {
    const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'database.json'), 'utf8') || '{}')
    if (!raw.data) raw.data = {}
    if (!raw.data.afk) raw.data.afk = {}
    raw.data.afk[userKey] = { name, reason, since: Date.now() }
    fs.writeFileSync(path.join(process.cwd(), 'database.json'), JSON.stringify(raw, null, 2))
  } catch {}

  return conn.sendMessage(jid, {
    text: `🛌 *AFK*\n\n${name} ahora está AFK\n📝 ${reason}`
  }, { quoted: m })
}

function normalize(jid) {
  if (!jid) return ''
  return jid.split('@')[0].split(':')[0] + '@s.whatsapp.net'
}
