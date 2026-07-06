export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  if (!chat?.endsWith('@g.us')) return

  // Intentar obtener número de: args, quoted contact, o quoted vcard
  let target = args[0]

  if (!target) {
    // Check quoted message for contact
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    if (quoted?.contactMessage?.vcard) {
      const vcard = quoted.contactMessage.vcard
      const match = vcard.match(/\+?\d[\d\s\-()]+/g)
      if (match) target = match[0].replace(/[\s\-()]/g, '')
    } else if (quoted?.contactsArrayMessage?.contacts) {
      const vcard = quoted.contactsArrayMessage.contacts[0]?.vcard
      if (vcard) {
        const match = vcard.match(/\+?\d[\d\s\-()]+/g)
        if (match) target = match[0].replace(/[\s\-()]/g, '')
      }
    }
  }

  if (!target) {
    return conn.sendMessage(chat, {
      text: '⚠️ *Uso:* .add <número>\n\n📌 *Ejemplos:*\n• .add 521234567890\n• .add +521234567890\n• Responde a un contacto compartido con .add\n\n💡 Solo números, sin espacios'
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
    } else {
      conn.sendMessage(chat, { text: `❌ No pude agregarlo\n• ${msg.slice(0, 100)}` }, { quoted: m })
    }
  }
}
