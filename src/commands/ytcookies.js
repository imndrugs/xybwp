import fs from 'fs'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { writeFileSync } from 'fs'

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''

  const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
  if (!quotedMsg?.documentMessage) {
    return conn.sendMessage(jid, {
      text: 'Envía o responde a un archivo cookies.txt de YouTube con .ytcookies\n\nPara exportar:\n1. Instala "Get cookies.txt LOCALLY" en Chrome\n2. Ve a youtube.com, inicia sesión\n3. Exporta cookies con la extensión\n4. Envía el archivo al chat y responde con .ytcookies'
    }, { quoted: m })
  }

  try {
    const mediaMsg = { message: { documentMessage: quotedMsg.documentMessage }, key: m.key }
    const buffer = await downloadMediaMessage(mediaMsg, 'buffer', {})

    if (!buffer || buffer.length < 50) {
      return conn.sendMessage(jid, { text: '❌ El archivo está vacío o es inválido.' }, { quoted: m })
    }

    const content = buffer.toString('utf-8')
    if (!content.includes('youtube.com') && !content.includes('.youtube.com')) {
      return conn.sendMessage(jid, {
        text: '❌ El archivo no contiene cookies de YouTube. Asegúrate de exportar desde youtube.com.'
      }, { quoted: m })
    }

    writeFileSync('src/youtube_cookies.txt', content)
    await conn.sendMessage(jid, {
      text: '✅ *Cookies de YouTube actualizadas*\n\n*CKV BOT*'
    }, { quoted: m })
  } catch (e) {
    console.error(e)
    await conn.sendMessage(jid, {
      text: `❌ Error al guardar cookies: ${e.message}`
    }, { quoted: m })
  }
}
