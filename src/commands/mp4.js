import { downloadContentFromMessage } from '@whiskeysockets/baileys'
import { execSync } from 'child_process'
import { tmpdir } from 'os'
import { writeFileSync, unlinkSync, readFileSync, existsSync } from 'fs'
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

    // Debug: check file
    let info = ''
    try {
      info = execSync(`ffprobe -v error -show_entries format=format_name:stream=codec_name -of csv=p=0 "${tmpInput}"`, { timeout: 5000, encoding: 'utf8' }).trim()
    } catch {}

    const cmds = [
      // Decode with explicit libwebp, encode with libx264
      `ffmpeg -y -c:v libwebp -i "${tmpInput}" -c:v libx264 -pix_fmt yuv420p -an "${tmpOutput}"`,
      // With libwebp_anim decoder (for animated webp)
      `ffmpeg -y -c:v libwebp_anim -i "${tmpInput}" -c:v libx264 -pix_fmt yuv420p -an "${tmpOutput}"`,
      // One-step conversion
      `ffmpeg -y -i "${tmpInput}" -c:v h264 -pix_fmt yuv420p -an "${tmpOutput}"`,
      // Raw conversion, no pixel format
      `ffmpeg -y -i "${tmpInput}" -c:v libx264 -an "${tmpOutput}"`,
      // Last resort
      `ffmpeg -y -i "${tmpInput}" -an "${tmpOutput}"`,
    ]

    let ok = false
    let lastErr = ''
    for (const cmd of cmds) {
      try {
        execSync(cmd, { timeout: 60000, stdio: 'pipe' })
        if (existsSync(tmpOutput) && readFileSync(tmpOutput).length > 200) { ok = true; break }
      } catch (e) {
        const stderr = e.stderr?.toString() || ''
        const lines = stderr.split('\n').filter(l => l.includes('Error'))
        lastErr = (lines[0] || e.message)?.trim()
      }
    }

    if (!ok) {
      const debug = info ? ` (ffprobe: ${info})` : ''
      throw new Error(`${lastErr}${debug}`)
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
