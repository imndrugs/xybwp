import sharp from 'sharp'
import { downloadContentFromMessage } from '@whiskeysockets/baileys'
import fs from 'fs'
import path from 'path'

const globeFile = path.join(process.cwd(), 'assets', 'globo.png')

export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid

  const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
  let mediaContent, mediaType
  if (quoted?.imageMessage) { mediaContent = quoted.imageMessage; mediaType = 'image' }
  else if (quoted?.stickerMessage) { mediaContent = quoted.stickerMessage; mediaType = 'sticker' }

  if (!mediaContent) {
    return conn.sendMessage(chat, { text: '⚠️ Responde a una imagen o sticker con .globo' }, { quoted: m })
  }

  await conn.sendMessage(chat, { text: '⏳ Procesando...' }, { quoted: m })

  try {
    const stream = await downloadContentFromMessage(mediaContent, mediaType)
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    const userBuffer = Buffer.concat(chunks)

    const globeBuffer = fs.readFileSync(globeFile)
    const gMeta = await sharp(globeBuffer).metadata()
    const gw = gMeta.width, gh = gMeta.height

    const raw = await sharp(globeBuffer).raw().toBuffer()
    const alpha = Buffer.alloc(gw * gh)
    for (let i = 0; i < gw * gh; i++) {
      const r = raw[i * 3], g = raw[i * 3 + 1], b = raw[i * 3 + 2]
      alpha[i] = (r < 150 && g < 150 && b < 150) ? 255 : 0
    }
    const globeOutline = await sharp(raw, { raw: { width: gw, height: gh, channels: 3 } })
      .joinChannel(alpha).png().toBuffer()

    const tmp = path.join(process.cwd(), 'temp')
    if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true })
    const outPath = path.join(tmp, `globo_${Date.now()}.webp`)

    await sharp(userBuffer)
      .resize(gw, gh, { fit: 'cover' })
      .composite([{ input: globeOutline, top: 0, left: 0 }])
      .webp({ quality: 90 }).toFile(outPath)

    await conn.sendMessage(chat, { sticker: { url: outPath } }, { quoted: m })
    try { fs.unlinkSync(outPath) } catch {}
  } catch (e) {
    conn.sendMessage(chat, { text: `❌ Error: ${e.message?.slice(0, 150)}` }, { quoted: m })
  }
}
