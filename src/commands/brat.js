import sharp from 'sharp'
import { makeSticker } from '../lib/sticker.js'
import { getSenderId } from '../lib/perms.js'

function wrapText(text, maxCharsPerLine = 12) {
  const words = text.split(' ')
  let lines = []
  let currentLine = ''

  words.forEach(word => {
    if ((currentLine + word).length > maxCharsPerLine) {
      if (currentLine) lines.push(currentLine.trim())
      currentLine = word + ' '
    } else {
      currentLine += word + ' '
    }
  })
  if (currentLine) lines.push(currentLine.trim())
  return lines
}

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''
  const sender = getSenderId(m)

  if (!args || args.length === 0) {
    return conn.sendMessage(jid, { text: '✏️ Uso: .brat <texto>\n\nEjemplo: .brat hola' }, { quoted: m })
  }

  try {
    const text = args.join(' ')

    let maxChars = 10
    if (text.length > 20) maxChars = 14
    if (text.length > 40) maxChars = 18

    const lines = wrapText(text, maxChars)

    const longestLineLength = Math.max(...lines.map(l => l.length), 1)

    const charWidth = 55
    const lineHeight = 95
    const paddingX = 40
    const paddingY = 40

    const svgWidth = (longestLineLength * charWidth) + paddingX
    const svgHeight = (lines.length * lineHeight) + paddingY

    const svgText = lines
      .map((line, index) => `<tspan x="${paddingX / 2}" dy="${index === 0 ? 0 : '1em'}">${line}</tspan>`)
      .join('')

    const svgBuffer = Buffer.from(`
      <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
        <style>
          .text {
            font-family: 'Arial', sans-serif;
            font-size: 90px;
            font-weight: bold;
            fill: black;
            letter-spacing: -3px;
          }
        </style>
        <rect width="100%" height="100%" fill="white"/>
        <text x="${paddingX / 2}" y="${lineHeight}" class="text">
          ${svgText}
        </text>
      </svg>
    `)

    const buffer = await sharp(svgBuffer)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .webp({ quality: 90 })
      .toBuffer()

    const stickerBuffer = await makeSticker(buffer, {
      packname: m.pushName || sender || 'bot',
      author: 'brat'
    })

    if (stickerBuffer) {
      await conn.sendMessage(jid, { sticker: stickerBuffer }, { quoted: m })
    } else {
      throw new Error('No se pudo generar el sticker')
    }
  } catch (error) {
    console.error(error)
    await conn.sendMessage(jid, { text: `Error: ${error.message}` }, { quoted: m })
  }
}