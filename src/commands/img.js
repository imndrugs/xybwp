import { downloadContentFromMessage } from '@whiskeysockets/baileys'
import { execSync } from 'child_process'
import { tmpdir } from 'os'
import { writeFileSync, unlinkSync, readFileSync } from 'fs'
import { join } from 'path'

export default async function handler(conn, m) {
  const jid = m.chat || m.key?.remoteJid || ''

  const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
  if (!quotedMsg?.stickerMessage) {
    return conn.sendMessage(jid, {
      text: 'Responde a un sticker con .img'
    }, { quoted: m })
  }

  try {
    const stream = await downloadContentFromMessage(quotedMsg.stickerMessage, 'sticker')
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    const buffer = Buffer.concat(chunks)

    const tmpInput = join(tmpdir(), `${Date.now()}.webp`)
    const tmpOutput = join(tmpdir(), `${Date.now()}.png`)
    writeFileSync(tmpInput, buffer)

    execSync(`ffmpeg -i "${tmpInput}" "${tmpOutput}"`, { timeout: 15000 })

    const imgBuffer = readFileSync(tmpOutput)
    await conn.sendMessage(jid, { image: imgBuffer }, { quoted: m })

    try { unlinkSync(tmpInput) } catch {}
    try { unlinkSync(tmpOutput) } catch {}
  } catch (e) {
    console.error(e)
    await conn.sendMessage(jid, { text: 'No pude convertir el sticker' }, { quoted: m })
  }
}
