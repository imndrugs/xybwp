import { isOwner, isAdmin, clean } from '../lib/perms.js'

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''
  const sender = m.key?.participant || m.key?.remoteJid || ''

  if (!isOwner(sender) && !isAdmin(sender, db)) {
    return conn.sendMessage(jid, {
      text: '🚫 Solo admins y owners pueden banear usuarios'
    }, { quoted: m })
  }

  const ctx = m.message?.extendedTextMessage?.contextInfo
  const target = ctx?.mentionedJid?.[0] || ctx?.participant || args[0]

  if (!target) {
    return conn.sendMessage(jid, {
      text: '⚠️ Menciona a alguien o responde a su mensaje\nUso: .ban @usuario [motivo]'
    }, { quoted: m })
  }

  const cleanTarget = clean(target)
  const cleanSender = clean(sender)

  if (cleanTarget === cleanSender) {
    return conn.sendMessage(jid, {
      text: '⚠️ No puedes banearte a ti mismo'
    }, { quoted: m })
  }

  if (isOwner(target)) {
    await conn.sendMessage(jid, { text: '👑 No puedes banear a un owner' }, { quoted: m })
    await conn.groupParticipantsUpdate(jid, [sender], 'remove').catch(() => {})
    return
  }

  if (!db.data.banned) db.data.banned = []

  if (db.data.banned.includes(cleanTarget)) {
    return conn.sendMessage(jid, {
      text: 'ℹ️ Este usuario ya está baneado'
    }, { quoted: m })
  }

  const motivo = args.slice(1).join(' ') || 'Sin motivo'

  db.data.banned.push(cleanTarget)

  try {
    const fs = await import('fs')
    const dataFile = 'database.json'
    const raw = JSON.parse(fs.readFileSync(dataFile, 'utf8') || '{}')
    if (!raw.data) raw.data = {}
    raw.data.banned = db.data.banned
    fs.writeFileSync(dataFile, JSON.stringify(raw, null, 2))
  } catch (e) {
    console.error('Error guardando ban:', e)
  }

  const mentionJid = target.includes('@') ? target : cleanTarget + '@s.whatsapp.net'
  const name = db.contacts?.[mentionJid] || conn.contacts?.[mentionJid]?.notify || cleanTarget

  await conn.sendMessage(jid, {
    text: `🚫 *${name}* baneado del bot\n📝 Motivo: ${motivo}\n\nYa no podrá usar comandos.`
  }, { quoted: m })
}