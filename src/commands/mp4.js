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
      text: 'Responde a un sticker animado con .mp4'
    }, { quoted: m })
  }

  try {
    const stream = await downloadContentFromMessage(quotedMsg.stickerMessage, 'sticker')
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    const buffer = Buffer.concat(chunks)

    const tmpInput = join(tmpdir(), `${Date.now()}.webp`)
    const tmpOutput = join(tmpdir(), `${Date.now()}.mp4`)
    writeFileSync(tmpInput, buffer)

    const encoders = ['libx264', 'h264', 'libx264rgb', 'mpeg4']
    let ok = false
    for (const enc of encoders) {
      try {
        execSync(
          `ffmpeg -y -i "${tmpInput}" -c:v ${enc} -pix_fmt yuv420p -an "${tmpOutput}"`,
          { timeout: 30000, stdio: 'pipe' }
        )
        if (readFileSync(tmpOutput).length > 100) { ok = true; break }
      } catch {}
    }

    if (!ok) {
      throw new Error('No se pudo codificar el video con ningun encoder')
    }

    const mp4Buffer = readFileSync(tmpOutput)
    await conn.sendMessage(jid, { video: mp4Buffer, caption: 'Sticker animado convertido' }, { quoted: m })

    try { unlinkSync(tmpInput) } catch {}
    try { unlinkSync(tmpOutput) } catch {}
  } catch (e) {
    console.error(e)
    await conn.sendMessage(jid, { text: `No pude convertir el sticker: ${e.message}` }, { quoted: m })
  }
}
