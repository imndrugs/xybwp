import fs from 'fs'
import { downloadMediaMessage } from '@whiskeysockets/baileys'

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''

  const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
  if (!quotedMsg?.documentMessage) {
    return conn.sendMessage(jid, {
      text: 'Envía o responde a un archivo de cookies.txt de Instagram con .igcookies\n\nPara exportar cookies:\n1. Instala "Get cookies.txt LOCALLY" en Chrome\n2. Ve a instagram.com, inicia sesión\n3. Haz clic en la extensión y exporta\n4. Envía el archivo al chat y responde con .igcookies'
    }, { quoted: m })
  }

  try {
    const mediaMsg = { message: { documentMessage: quotedMsg.documentMessage }, key: m.key }
    const buffer = await downloadMediaMessage(mediaMsg, 'buffer', {})
    const content = buffer.toString('utf-8')

    if (!content.includes('instagram.com')) {
      return conn.sendMessage(jid, {
        text: '❌ El archivo no contiene cookies de Instagram. Asegúrate de exportar desde instagram.com.'
      }, { quoted: m })
    }

    fs.writeFileSync('src/instagram_cookies.txt', content)
    await conn.sendMessage(jid, {
      text: '✅ Cookies de Instagram actualizadas correctamente.'
    }, { quoted: m })
  } catch (e) {
    console.error(e)
    await conn.sendMessage(jid, {
      text: `❌ Error al guardar cookies: ${e.message}`
    }, { quoted: m })
  }
}
