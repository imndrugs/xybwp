import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { execSync } from 'child_process'
import { tmpdir } from 'os'
import { writeFileSync, unlinkSync, readFileSync } from 'fs'
import { join } from 'path'

export default async function handler(conn, m) {
  const jid = m.chat || m.key?.remoteJid || ''

  const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
  if (!quotedMsg?.stickerMessage) {
    return conn.sendMessage(jid, {
      text: 'Responde a un sticker animado con .mp4'
    }, { quoted: m })
  }

  try {
    const mediaMessage = { message: { stickerMessage: quotedMsg.stickerMessage }, key: m.key }
    const buffer = await downloadMediaMessage(mediaMessage, conn, {})

    const tmpInput = join(tmpdir(), `${Date.now()}.webp`)
    const tmpOutput = join(tmpdir(), `${Date.now()}.mp4`)
    writeFileSync(tmpInput, buffer)

    execSync(`ffmpeg -i "${tmpInput}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${tmpOutput}"`, { timeout: 15000 })

    const mp4Buffer = readFileSync(tmpOutput)
    await conn.sendMessage(jid, { video: mp4Buffer, caption: 'Sticker animado convertido' }, { quoted: m })

    try { unlinkSync(tmpInput) } catch {}
    try { unlinkSync(tmpOutput) } catch {}
  } catch (e) {
    console.error(e)
    await conn.sendMessage(jid, { text: 'No pude convertir el sticker' }, { quoted: m })
  }
}
