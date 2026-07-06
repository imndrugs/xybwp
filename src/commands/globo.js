import sharp from 'sharp'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import fs from 'fs'
import path from 'path'

const globeFile = path.join(process.cwd(), 'assets', 'globo.png')

export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid

  const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
  const mediaMessage = quotedMsg?.imageMessage
    ? { message: { imageMessage: quotedMsg.imageMessage }, key: { id: m.key?.id } }
    : null

  if (!mediaMessage) {
    return conn.sendMessage(chat, { text: '⚠️ Responde a una imagen con .globo' }, { quoted: m })
  }

  await conn.sendMessage(chat, { text: '⏳ Procesando...' }, { quoted: m })

  try {
    const userBuffer = await downloadMediaMessage(mediaMessage, 'buffer', {})
    const globeBuffer = fs.readFileSync(globeFile)

    const gMeta = await sharp(globeBuffer).metadata()
    const gw = gMeta.width, gh = gMeta.height

    // Make outline-only version of globe (dark pixels opaque, light interior transparent)
    const raw = await sharp(globeBuffer).raw().toBuffer()
    const alpha = Buffer.alloc(gw * gh)
    for (let i = 0; i < gw * gh; i++) {
      const r = raw[i * 3], g = raw[i * 3 + 1], b = raw[i * 3 + 2]
      alpha[i] = (r < 150 && g < 150 && b < 150) ? 255 : 0
    }
    const globeOutline = await sharp(raw, { raw: { width: gw, height: gh, channels: 3 } })
      .joinChannel(alpha)
      .png()
      .toBuffer()

    // Composite user image with globe outline on top
    const outPath = path.join(process.cwd(), 'temp', `globo_${Date.now()}.webp`)
    if (!fs.existsSync(path.join(process.cwd(), 'temp'))) fs.mkdirSync(path.join(process.cwd(), 'temp'), { recursive: true })

    await sharp(userBuffer)
      .resize(gw, gh, { fit: 'cover' })
      .composite([{ input: globeOutline, top: 0, left: 0 }])
      .webp({ quality: 90 })
      .toFile(outPath)

    await conn.sendMessage(chat, { sticker: { url: outPath } }, { quoted: m })
    try { fs.unlinkSync(outPath) } catch {}
  } catch (e) {
    conn.sendMessage(chat, { text: `❌ Error: ${e.message?.slice(0, 100)}` }, { quoted: m })
  }
}
