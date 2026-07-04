import { downloadMediaMessage } from '@whiskeysockets/baileys'
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
    const mediaMsg = { message: { stickerMessage: quotedMsg.stickerMessage } }
    const buffer = await downloadMediaMessage(mediaMsg, 'buffer', {})

    if (!buffer || buffer.length < 50) throw new Error('Sticker vacío o corrupto')

    const ts = Date.now()
    const tmpInput = join(tmpdir(), `${ts}.webp`)
    const tmpOutput = join(tmpdir(), `${ts}.mp4`)
    writeFileSync(tmpInput, buffer)

    let info = ''
    try {
      info = execSync(
        `ffprobe -v error -show_entries format=format_name:stream=codec_name,width,height -of csv=p=0 "${tmpInput}"`,
        { timeout: 5000, encoding: 'utf8' }
      ).trim()
    } catch {}

    const cmds = [
      `ffmpeg -y -c:v libwebp -i "${tmpInput}" -c:v libx264 -pix_fmt yuv420p -an "${tmpOutput}"`,
      `ffmpeg -y -c:v libwebp_anim -i "${tmpInput}" -c:v libx264 -pix_fmt yuv420p -an "${tmpOutput}"`,
      `ffmpeg -y -i "${tmpInput}" -c:v libx264 -pix_fmt yuv420p -an "${tmpOutput}"`,
      `ffmpeg -y -i "${tmpInput}" -c:v h264 -pix_fmt yuv420p -an "${tmpOutput}"`,
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
        const errLine = stderr.split('\n').filter(l => l.includes('Error'))[0]
        lastErr = (errLine || e.message)?.trim()
      }
    }

    if (!ok) {
      const debug = info ? ` (ffprobe: ${info})` : ' (sin info)'
      const size = ` (${buffer.length} bytes)`
      throw new Error(`${lastErr}${debug}${size}`)
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
