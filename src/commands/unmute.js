import { isOwner, getSenderId } from '../lib/perms.js'
import fs from 'fs'
import path from 'path'

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''
  const sender = getSenderId(m)

  if (!isOwner(sender)) {
    return conn.sendMessage(jid, {
      text: '⛔ Solo el OWNER puede usar este comando'
    }, { quoted: m })
  }

  const ctx = m.message?.extendedTextMessage?.contextInfo
  let target = ctx?.participant || ctx?.mentionedJid?.[0]

  if (!target) {
    return conn.sendMessage(jid, {
      text: '⚠️ Responde a alguien o menciónalo para desmutearlo'
    }, { quoted: m })
  }

  const targetId = target.split('@')[0].split(':')[0] + '@s.whatsapp.net'

  if (!db.data.muted) db.data.muted = []
  if (!db.data.muted.includes(targetId)) {
    return conn.sendMessage(jid, {
      text: '⚠️ Este usuario no está muteado'
    }, { quoted: m })
  }

  db.data.muted = db.data.muted.filter(id => id !== targetId)

  try {
    const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'database.json'), 'utf8') || '{}')
    if (raw.data?.muted) {
      raw.data.muted = raw.data.muted.filter(id => id !== targetId)
      fs.writeFileSync(path.join(process.cwd(), 'database.json'), JSON.stringify(raw, null, 2))
    }
  } catch {}

  const name = db.contacts?.[targetId] || targetId.split('@')[0]
  return conn.sendMessage(jid, {
    text: `🔊 Usuario desmuteado: ${name}\n\nYa puede volver a escribir.`
  }, { quoted: m })
}
