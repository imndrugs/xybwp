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
    console.log('[globo] Iniciando descarga de contenido media...')
    const stream = await downloadContentFromMessage(mediaContent, mediaType)
    console.log('[globo] Stream obtenido, leyendo chunks...')
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    const userBuffer = Buffer.concat(chunks)
    console.log('[globo] Buffer descargado, tamaño:', userBuffer.length)

    console.log('[globo] Leyendo globo.png...')
    const globeBuffer = fs.readFileSync(globeFile)
    console.log('[globo] globeBuffer tamaño:', globeBuffer.length)

    console.log('[globo] Obteniendo metadata de globe...')
    const gMeta = await sharp(globeBuffer).metadata()
    console.log('[globo] globo dimensiones:', gMeta.width, 'x', gMeta.height, 'canales:', gMeta.channels)
    const gw = gMeta.width, gh = gMeta.height

    console.log('[globo] Extrayendo raw pixels del globo...')
    const raw = await sharp(globeBuffer).raw().toBuffer()
    console.log('[globo] raw buffer tamaño:', raw.length)

    console.log('[globo] Creando máscara alpha...')
    const alpha = Buffer.alloc(gw * gh)
    for (let i = 0; i < gw * gh; i++) {
      const r = raw[i * 3], g = raw[i * 3 + 1], b = raw[i * 3 + 2]
      alpha[i] = (r < 150 && g < 150 && b < 150) ? 255 : 0
    }
    const darkPixels = alpha.filter(v => v === 255).length
    console.log('[globo] Pixeles oscuros (outline):', darkPixels, 'de', gw * gh)

    console.log('[globo] Reconstruyendo globo con alpha...')
    const globeOutline = await sharp(raw, { raw: { width: gw, height: gh, channels: 3 } })
      .joinChannel(alpha).png().toBuffer()
    console.log('[globo] globeOutline tamaño:', globeOutline.length)

    const tmp = path.join(process.cwd(), 'temp')
    if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true })
    const outPath = path.join(tmp, `globo_${Date.now()}.webp`)

    console.log('[globo] Redimensionando userBuffer a', gw, 'x', gh, '...')
    const resized = await sharp(userBuffer)
      .resize(gw, gh, { fit: 'cover' })
      .png().toBuffer()
    console.log('[globo] User image redimensionada, tamaño:', resized.length)

    console.log('[globo] Componiendo imagen final...')
    await sharp(resized)
      .composite([{ input: globeOutline, top: 0, left: 0 }])
      .webp({ quality: 90 }).toFile(outPath)
    console.log('[globo] Archivo guardado en:', outPath)

    console.log('[globo] Enviando sticker...')
    await conn.sendMessage(chat, { sticker: { url: outPath } }, { quoted: m })
    console.log('[globo] Sticker enviado correctamente')
    try { fs.unlinkSync(outPath) } catch {}
  } catch (e) {
    console.log('[globo] ERROR:', e.message)
    console.log('[globo] Stack:', e.stack)
    conn.sendMessage(chat, { text: `❌ Error: ${e.message?.slice(0, 150)}` }, { quoted: m })
  }
}
