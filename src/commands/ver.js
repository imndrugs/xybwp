import { downloadContentFromMessage } from '@whiskeysockets/baileys'

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

  const saved = global._savedPhotos.get(quotedId)
  try {
    const stream = await downloadContentFromMessage(saved.imageMessage, 'image')
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    const buffer = Buffer.concat(chunks)

    await conn.sendMessage(jid, {
      image: buffer,
      caption: 'Foto solicitada'
    }, { quoted: m })
  } catch (e) {
    console.error(e)
    await conn.sendMessage(jid, {
      text: 'Error al descargar la foto. Intenta de nuevo.'
    }, { quoted: m })
  }
}
