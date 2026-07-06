export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  if (!chat?.endsWith('@g.us')) return

  let target = args[0]

  if (!target) {
    const contextInfo = m.message?.extendedTextMessage?.contextInfo
    if (contextInfo?.mentionedJid?.length) {
      target = contextInfo.mentionedJid[0]
    } else {
      const quoted = contextInfo?.quotedMessage
      if (quoted?.contactMessage?.vcard) {
        const match = quoted.contactMessage.vcard.match(/\+?\d[\d\s\-()]+/g)
        if (match) target = match[0].replace(/[\s\-()]/g, '')
      } else if (quoted?.contactsArrayMessage?.contacts?.[0]?.vcard) {
        const match = quoted.contactsArrayMessage.contacts[0].vcard.match(/\+?\d[\d\s\-()]+/g)
        if (match) target = match[0].replace(/[\s\-()]/g, '')
      }
    }
  }

  if (!target) {
    return conn.sendMessage(chat, {
      text: '⚠️ *Uso:* .add <número>\n\n📌 *Ejemplos:*\n• .add 521234567890\n• .add +521234567890\n• .add @usuario (etiquetando)\n• Responde a un contacto compartido con .add\n\n💡 Solo números, sin espacios'
    }, { quoted: m })
  }

  let jid = target.replace(/[^0-9]/g, '')
  if (!jid || jid.length < 8) {
    return conn.sendMessage(chat, { text: '⚠️ Número inválido. Ej: .add 521234567890' }, { quoted: m })
  }
  jid = jid + '@s.whatsapp.net'

  try {
    await conn.groupParticipantsUpdate(chat, [jid], 'add')
    conn.sendMessage(chat, { text: `✅ @${jid.split('@')[0]} agregado al grupo\n\n*CKV BOT*` }, { quoted: m, mentions: [jid] })
  } catch (e) {
    const msg = e?.message || ''
    if (msg.includes('already')) {
      conn.sendMessage(chat, { text: '⚠️ Ese número ya está en el grupo' }, { quoted: m })
    } else if (msg.includes('not_authorized') || msg.includes('forbidden') || msg.includes('403')) {
      conn.sendMessage(chat, { text: '❌ El bot necesita ser admin del grupo para agregar miembros' }, { quoted: m })
    } else if (msg.includes('account_reachout_restricted') || msg.includes('rate')) {
      conn.sendMessage(chat, { text: '❌ WhatsApp restringió esta acción temporalmente. Espera unos minutos' }, { quoted: m })
    } else {
      conn.sendMessage(chat, { text: `❌ No pude agregarlo\n• ${msg.slice(0, 100)}` }, { quoted: m })
    }
  }
}
