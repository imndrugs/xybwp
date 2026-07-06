import sharp from 'sharp'
import { downloadContentFromMessage } from '@whiskeysockets/baileys'
import fs from 'fs'
import path from 'path'

const globeFile = path.join(process.cwd(), 'assets', 'globo.png')
const STICKER = 512

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
    const user = Buffer.concat(chunks)
    console.log('[globo] user buffer size:', user.length)

    const globe = fs.readFileSync(globeFile)
    console.log('[globo] globe file size:', globe.length)

    const gm = await sharp(globe).metadata()
    const gw = gm.width, gh = gm.height
    console.log('[globo] globe meta:', gw, 'x', gh, 'channels:', gm.channels)

    const um = await sharp(user).metadata()
    console.log('[globo] user meta:', um.width, 'x', um.height)

    const uw = gw
    const uh = Math.max(1, Math.round(uw * um.height / um.width))
    const totalH = gh + uh
    console.log('[globo] canvas:', gw, 'x', totalH, 'user will be:', uw, 'x', uh, 'at top=', gh)

    const tmp = path.join(process.cwd(), 'temp')
    if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true })

    console.log('[globo] resizing user...')
    const userResized = await sharp(user).resize(uw, uh, { fit: 'cover' }).png().toBuffer()
    console.log('[globo] userResized buffer size:', userResized.length)

    const fullPath = path.join(tmp, `globo_full_${Date.now()}.png`)
    console.log('[globo] converting globe to safe PNG...')
    const globeReady = await sharp(globe).png().toBuffer()
    console.log('[globo] globeReady size:', globeReady.length)

    console.log('[globo] creating canvas and compositing...')
    await sharp({ create: { width: gw, height: totalH, channels: 3, background: { r: 255, g: 255, b: 255 } } })
      .composite([
        { input: globeReady, top: 0, left: 0 },
        { input: userResized, top: gh, left: 0 }
      ])
      .png()
      .toFile(fullPath)
    console.log('[globo] full composite saved:', fullPath)

    const fullMeta = await sharp(fullPath).metadata()
    console.log('[globo] full image meta:', fullMeta.width, 'x', fullMeta.height)

    const out = path.join(tmp, `globo_${Date.now()}.webp`)
    console.log('[globo] resizing to sticker...')
    await sharp(fullPath)
      .resize(STICKER, STICKER, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .webp({ quality: 90 })
      .toFile(out)
    console.log('[globo] sticker saved:', out)

    console.log('[globo] sending...')
    await conn.sendMessage(chat, { sticker: { url: out } }, { quoted: m })
    console.log('[globo] done')
    try { fs.unlinkSync(fullPath) } catch {}
    try { fs.unlinkSync(out) } catch {}
  } catch (e) {
    console.log('[globo] ERROR:', e.message)
    console.log('[globo] STACK:', e.stack?.split('\n').slice(0, 4).join('\n'))
    await conn.sendMessage(chat, { text: `❌ Error: ${e.message?.slice(0, 150)}` }, { quoted: m })
  }
}
