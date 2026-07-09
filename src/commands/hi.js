import { sendAnimeGif } from '../lib/gif.js'

function normalize(jid) {
  if (!jid) return ''
  return jid.split('@')[0].split(':')[0] + '@s.whatsapp.net'
}

function getName(conn, db, jid) {
  const key = normalize(jid)
  const contact = conn.contacts?.[key]
  if (contact) return contact.notify || contact.name || contact.pushName || null
  return db?.contacts?.[key] || null
}

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''
  const senderJid = normalize(m.key?.participant || m.key?.remoteJid)

  if (!db.contacts) db.contacts = {}
  if (!conn.contacts) conn.contacts = {}
  conn.contacts[senderJid] = conn.contacts[senderJid] || { id: senderJid, notify: m.pushName, name: m.pushName }
  db.contacts[senderJid] = db.contacts[senderJid] || m.pushName

  const senderName = getName(conn, db, senderJid) || senderJid.split('@')[0] || 'Alguien'

  try {
    await sendAnimeGif(conn, jid, 'kiss', `👋 ${senderName} dice hola`, m)
  } catch (err) {
    console.error('Error en hi:', err)
    await conn.sendMessage(jid, {
      text: '❌ No pude obtener un GIF. Inténtalo de nuevo.'
    }, { quoted: m })
  }
}
