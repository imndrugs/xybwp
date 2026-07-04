import { canUse } from '../lib/roles.js'
import { getSenderId, clean } from '../lib/perms.js'

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''
  const sender = getSenderId(m)

  if (!canUse(sender, ['owner', 'admin'], db)) {
    return conn.sendMessage(jid, { text: '⛔ Solo owners o admins pueden usar este comando' }, { quoted: m })
  }

  const groupMetadata = await conn.groupMetadata(jid).catch(() => null)
  if (!groupMetadata) {
    return conn.sendMessage(jid, { text: '⚠️ Solo funciona en grupos' }, { quoted: m })
  }

  const rawBotId = conn.user?.jid || conn.user?.id || ''
  const botNumber = typeof rawBotId === 'object' ? (rawBotId.user || '') : String(rawBotId).split('@')[0].split(':')[0]
  const botParticipant = groupMetadata.participants.find(p => p.id.split('@')[0].split(':')[0] === botNumber)
  if (!botParticipant || (botParticipant.admin !== 'admin' && botParticipant.admin !== 'superadmin')) {
    return conn.sendMessage(jid, { text: '❌ El bot debe ser admin del grupo para despromover' }, { quoted: m })
  }

  const ctx = m.message?.extendedTextMessage?.contextInfo
  const target = ctx?.mentionedJid?.[0] || ctx?.participant || null

  if (!target) {
    return conn.sendMessage(jid, { text: '⚠️ Menciona o responde al mensaje de un usuario para quitarle el admin' }, { quoted: m })
  }

  const targetClean = clean(target)
  const isGroupOwner = groupMetadata.owner && clean(groupMetadata.owner) === targetClean
  if (isGroupOwner) {
    return conn.sendMessage(jid, { text: '❌ No puedo quitar admin al dueño del grupo' }, { quoted: m })
  }

  const isAdmin = groupMetadata.participants.some(p => clean(p.id) === targetClean && (p.admin === 'admin' || p.admin === 'superadmin'))
  if (!isAdmin) {
    return conn.sendMessage(jid, { text: 'ℹ️ Este usuario no es admin del grupo' }, { quoted: m })
  }

  try {
    await conn.groupParticipantsUpdate(jid, [target], 'demote')
    const name = db.contacts?.[targetClean + '@s.whatsapp.net'] || targetClean
    await conn.sendMessage(jid, { text: `⬇️ *${name}* ya no es admin del grupo` }, { quoted: m })
  } catch (e) {
    console.error('Error demoting:', e)
    await conn.sendMessage(jid, {
      text: `❌ No pude quitar admin a @${targetClean}\nAsegúrate de que el bot sea admin`,
      mentions: [target]
    }, { quoted: m })
  }
}
