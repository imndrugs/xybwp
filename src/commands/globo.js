import sharp from 'sharp'
import { downloadContentFromMessage } from '@whiskeysockets/baileys'
import fs from 'fs'
import path from 'path'

const globeFile = path.join(process.cwd(), 'assets', 'globo.png')
const STICKER_SIZE = 512

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

    // Resize user image to match globe width, keep aspect ratio
    const uMeta = await sharp(userBuffer).metadata()
    const uRatio = uMeta.width / uMeta.height
    const uw = gw
    const uh = Math.round(uw / uRatio)

    const tmp = path.join(process.cwd(), 'temp')
    if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true })
    const outPath = path.join(tmp, `globo_${Date.now()}.webp`)

    // Stack globe on top, user image below → then resize to sticker size
    const totalH = gh + uh
    await sharp({
      create: { width: gw, height: totalH, channels: 3, background: { r: 255, g: 255, b: 255 } }
    })
      .composite([
        { input: globeBuffer, top: 0, left: 0 },
        { input: await sharp(userBuffer).resize(uw, uh, { fit: 'cover' }).png().toBuffer(), top: gh, left: 0 }
      ])
      .resize(STICKER_SIZE, STICKER_SIZE, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .webp({ quality: 90 })
      .toFile(outPath)

    await conn.sendMessage(chat, { sticker: { url: outPath } }, { quoted: m })
    try { fs.unlinkSync(outPath) } catch {}
  } catch (e) {
    conn.sendMessage(chat, { text: `❌ Error: ${e.message?.slice(0, 150)}` }, { quoted: m })
  }
}
