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

    const ts = Date.now()
    const tmpInput = join(tmpdir(), `${ts}.webp`)
    const tmpOutput = join(tmpdir(), `${ts}.mp4`)
    writeFileSync(tmpInput, buffer)

    // Check if webp is valid
    const fileSize = buffer.length
    if (fileSize < 50) throw new Error('Sticker vacío o corrupto')

    // Strategies for webp → mp4 conversion
    const strategies = [
      // 1) Native h264 + handle transparency with white bg
      `ffmpeg -y -i "${tmpInput}" -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p" -c:v h264 -an "${tmpOutput}"`,
      // 2) libx264 + transparency fix
      `ffmpeg -y -i "${tmpInput}" -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p" -c:v libx264 -an "${tmpOutput}"`,
      // 3) With libx264rgb
      `ffmpeg -y -i "${tmpInput}" -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264rgb -an "${tmpOutput}"`,
      // 4) Simple conversion (let ffmpeg decide)
      `ffmpeg -y -i "${tmpInput}" -an "${tmpOutput}"`,
    ]

    let ok = false
    let lastErr = ''
    for (const cmd of strategies) {
      try {
        execSync(cmd, { timeout: 30000, stdio: 'pipe' })
        const outSize = readFileSync(tmpOutput).length
        if (outSize > 200) { ok = true; break }
      } catch (e) {
        lastErr = e.stderr?.toString().split('\n').slice(-3).join(' ').trim() || e.message
      }
    }

    if (!ok) {
      throw new Error(`ffmpeg: ${lastErr || 'todos los métodos fallaron'}`)
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
