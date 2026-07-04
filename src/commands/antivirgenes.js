import fs from 'fs'
import path from 'path'

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''
  if (!jid.endsWith('@g.us')) {
    return conn.sendMessage(jid, { text: '⚠️ Este comando solo funciona en grupos' }, { quoted: m })
  }

  if (!db.data.antivirgenes) db.data.antivirgenes = []

  const idx = db.data.antivirgenes.indexOf(jid)
  if (idx === -1) {
    db.data.antivirgenes.push(jid)
  } else {
    db.data.antivirgenes.splice(idx, 1)
  }

  const dataFile = path.join(process.cwd(), 'database.json')
  try {
    const raw = JSON.parse(fs.readFileSync(dataFile, 'utf8') || '{}')
    if (!raw.data) raw.data = {}
    raw.data.antivirgenes = [...db.data.antivirgenes]
    fs.writeFileSync(dataFile, JSON.stringify(raw, null, 2))
  } catch {}

  return conn.sendMessage(jid, {
    text: idx === -1
      ? '✅ Antivirgenes ACTIVADO. Cualquier contacto compartido será expulsado.'
      : '✅ Antivirgenes DESACTIVADO.'
  }, { quoted: m })
}