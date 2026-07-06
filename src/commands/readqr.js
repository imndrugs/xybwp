import axios from 'axios'
import { downloadMediaMessage } from '@whiskeysockets/baileys'

export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid

  const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
  const mediaMessage = quotedMsg?.imageMessage ? { message: { imageMessage: quotedMsg.imageMessage }, key: { id: m.key?.id } } : null

  if (!mediaMessage) {
    return conn.sendMessage(chat, { text: '⚠️ Responde a una imagen con código QR con .readqr' }, { quoted: m })
  }

  try {
    const buffer = await downloadMediaMessage(mediaMessage, 'buffer', {})
    const b64 = buffer.toString('base64')
    const res = await axios.post('https://api.qrserver.com/v1/read-qr-code/', `file=data:image/png;base64,${b64}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000
    })
    const data = res?.data?.[0]?.symbol?.[0]?.data
    if (data) {
      conn.sendMessage(chat, { text: `📖 *QR leído*\n\n${data}\n\n*CKV BOT*` }, { quoted: m })
    } else {
      conn.sendMessage(chat, { text: '❌ No se detectó código QR en la imagen' }, { quoted: m })
    }
  } catch {
    conn.sendMessage(chat, { text: '❌ Error al leer el QR' }, { quoted: m })
  }
}
