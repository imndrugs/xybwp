export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''

  const quotedMsg = m.message?.extendedTextMessage?.contextInfo
  if (!quotedMsg) {
    return conn.sendMessage(jid, {
      text: 'Responde a una foto con .ver para verla.'
    }, { quoted: m })
  }

  const quotedId = quotedMsg.stanzaId
  if (!quotedId || !global._savedPhotos?.has(quotedId)) {
    return conn.sendMessage(jid, {
      text: 'No hay foto guardada para ese mensaje.'
    }, { quoted: m })
  }

  await conn.sendMessage(jid, { text: 'guardando foto' }, { quoted: m })

  const saved = global._savedPhotos.get(quotedId)
  if (!saved?.buffer) {
    return conn.sendMessage(jid, {
      text: 'La foto aún se está descargando, intenta de nuevo.'
    }, { quoted: m })
  }

  await conn.sendMessage(jid, {
    image: saved.buffer,
    caption: 'Foto solicitada'
  }, { quoted: m })
}
