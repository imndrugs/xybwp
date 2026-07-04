import { canUse } from '../lib/roles.js'
import { getSenderId, clean } from '../lib/perms.js'

function getBotNumber(conn) {
  const raw = conn.user?.jid || conn.user?.id || ''
  if (typeof raw === 'object') {
    if (raw.remoteJid) return String(raw.remoteJid).split('@')[0].split(':')[0]
    if (raw.user) return String(raw.user)
    return ''
  }
  return String(raw).split('@')[0].split(':')[0]
}

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

  const botNumber = getBotNumber(conn)
  const botParticipant = groupMetadata.participants.find(p => {
    const pNum = p.id.split('@')[0].split(':')[0]
    return pNum === botNumber
  })

  if (!botParticipant || (botParticipant.admin !== 'admin' && botParticipant.admin !== 'superadmin')) {
    console.log('[PROMOTE] Bot not admin. botNumber:', botNumber, 'participants:', groupMetadata.participants.map(p => p.id.split('@')[0]))
    return conn.sendMessage(jid, { text: '❌ El bot debe ser admin del grupo para promover' }, { quoted: m })
  }

  const ctx = m.message?.extendedTextMessage?.contextInfo
  const target = ctx?.mentionedJid?.[0] || ctx?.participant || null

  if (!target) {
    return conn.sendMessage(jid, { text: '⚠️ Menciona o responde al mensaje de un usuario para promoverlo' }, { quoted: m })
  }

  const targetClean = clean(target)
  const isAlreadyAdmin = groupMetadata.participants.some(p => clean(p.id) === targetClean && (p.admin === 'admin' || p.admin === 'superadmin'))
  if (isAlreadyAdmin) {
    return conn.sendMessage(jid, { text: 'ℹ️ Este usuario ya es admin del grupo' }, { quoted: m })
  }

  try {
    await conn.groupParticipantsUpdate(jid, [target], 'promote')
    const name = db.contacts?.[targetClean + '@s.whatsapp.net'] || targetClean
    await conn.sendMessage(jid, { text: `⭐ *${name}* ahora es admin del grupo` }, { quoted: m })
  } catch (e) {
    console.error('Error promoting:', e)
    await conn.sendMessage(jid, {
      text: `❌ No pude promover a @${targetClean}\nAsegúrate de que el bot sea admin`,
      mentions: [target]
    }, { quoted: m })
  }
}
