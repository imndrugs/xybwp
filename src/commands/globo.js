import axios from 'axios'
import sharp from 'sharp'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import fs from 'fs'
import path from 'path'

const GLOBE_URL = 'https://cdn.discordapp.com/attachments/1517453653890437140/1523494786450067569/globo.png'
const tmpDir = path.join(process.cwd(), 'temp')
const globeCache = path.join(tmpDir, 'globo_overlay.png')

async function getGlobeOverlay() {
  if (fs.existsSync(globeCache)) return globeCache
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
  const res = await axios.get(GLOBE_URL, {
    responseType: 'arraybuffer',
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 15000
  })
  fs.writeFileSync(globeCache, res.data)
  return globeCache
}

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
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

    const globePath = await getGlobeOverlay()
    const globeMeta = await sharp(globePath).metadata()
    const gw = globeMeta.width
    const gh = globeMeta.height

    const userResized = await sharp(userBuffer)
      .resize(gw, gh, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer()

    const outputPath = path.join(tmpDir, `globo_out_${Date.now()}.webp`)

    await sharp({
      create: { width: gw, height: gh, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    })
      .composite([
        { input: userResized, top: 0, left: 0 },
        { input: globePath, top: 0, left: 0 },
      ])
      .webp({ quality: 90 })
      .toFile(outputPath)

    await conn.sendMessage(chat, { sticker: { url: outputPath } }, { quoted: m })
    try { fs.unlinkSync(outputPath) } catch {}
  } catch (e) {
    conn.sendMessage(chat, { text: `❌ Error: ${e.message?.slice(0, 100)}` }, { quoted: m })
  }
}
