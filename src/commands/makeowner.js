import { isOwner, getSenderId, clean } from '../lib/perms.js'

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''
  const sender = getSenderId(m)

  if (!isOwner(sender)) {
    return conn.sendMessage(jid, {
      text: '🔒 Solo el owner puede usar este comando'
    }, { quoted: m })
  }

  const ctx = m.message?.extendedTextMessage?.contextInfo
  let target = ctx?.mentionedJid?.[0] || ctx?.participant || null
  if (!target) {
    return conn.sendMessage(jid, {
      text: '⚠️ Menciona o responde al usuario que quieres hacer owner'
    }, { quoted: m })
  }

  const targetClean = clean(target)

  if (!global.db.data.admins) global.db.data.admins = []
  if (global.db.data.admins.includes(targetClean)) {
    return conn.sendMessage(jid, {
      text: '⚠️ Ese usuario ya es admin'
    }, { quoted: m })
  }

  global.db.data.admins.push(targetClean)

  return conn.sendMessage(jid, {
    text: `✅ @${targetClean} agregado como admin del bot`,
    mentions: [target]
  }, { quoted: m })
}