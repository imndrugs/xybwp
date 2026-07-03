import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { execSync } from 'child_process'
import { tmpdir } from 'os'
import { writeFileSync, unlinkSync, readFileSync } from 'fs'
import { join } from 'path'
import { makeSticker } from '../lib/sticker.js'
import { getSenderId } from '../lib/perms.js'

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''
  const sender = getSenderId(m)

  let packname = m.pushName || sender || 'bot'
  let author = ''

  if (args[0]) {
    const text = args.join(' ')
    if (text.includes('/') || text.includes('|')) {
      const sep = text.includes('/') ? '/' : '|'
      const [p1, p2] = text.split(sep)
      packname = p1?.trim() || packname
      author = p2?.trim() || ''
    } else {
      packname = text.trim()
      author = ''
    }
  }

  try {
    const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const message = m.message || {}
    const mediaMessage =
      message.imageMessage ? { message: { imageMessage: message.imageMessage } } :
      message.videoMessage ? { message: { videoMessage: message.videoMessage } } :
      message.stickerMessage ? { message: { stickerMessage: message.stickerMessage } } :
      quotedMsg?.imageMessage ? { message: { imageMessage: quotedMsg.imageMessage } } :
      quotedMsg?.videoMessage ? { message: { videoMessage: quotedMsg.videoMessage } } :
      quotedMsg?.stickerMessage ? { message: { stickerMessage: quotedMsg.stickerMessage } } :
      null

    const media =
      message.imageMessage ||
      message.videoMessage ||
      message.stickerMessage ||
      quotedMsg?.imageMessage ||
      quotedMsg?.videoMessage ||
      quotedMsg?.stickerMessage

    if (!media) {
      return conn.sendMessage(jid, { text: '🖼️ Responde a una imagen, video o GIF con .sticker' }, { quoted: m })
    }

    const buffer = await downloadMediaMessage(mediaMessage, 'buffer', {})

    const isVideo = !!message.videoMessage || !!quotedMsg?.videoMessage || media?.mimetype?.startsWith('video/') || false

    if (isVideo) {
      const duration = (message.videoMessage?.seconds || quotedMsg?.videoMessage?.seconds || 0)
      if (duration > 10) {
        return conn.sendMessage(jid, { text: '🎬 El video no puede durar más de 10 segundos' }, { quoted: m })
      }
      const tmpInput = join(tmpdir(), `${Date.now()}.mp4`)
      const tmpOutput = join(tmpdir(), `${Date.now()}.webp`)
      try {
        writeFileSync(tmpInput, buffer)
        execSync(
          `ffmpeg -i "${tmpInput}" -vcodec libwebp -vf "scale=512:512:force_original_aspect_ratio=increase,crop=512:512,fps=15" -loop 0 -an -y "${tmpOutput}"`,
          { timeout: 30000 }
        )
        const webpBuffer = readFileSync(tmpOutput)
        await conn.sendMessage(jid, { sticker: webpBuffer }, { quoted: m })
      } finally {
        try { unlinkSync(tmpInput) } catch {}
        try { unlinkSync(tmpOutput) } catch {}
      }
    } else {
      const stickerBuffer = await makeSticker(buffer, { packname, author })
      await conn.sendMessage(jid, { sticker: stickerBuffer }, { quoted: m })
    }
  } catch (error) {
    console.error(error)
    await conn.sendMessage(jid, { text: '❌ No pude crear el sticker' }, { quoted: m })
  }
}
