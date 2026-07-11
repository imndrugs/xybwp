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
    if (text.length > 20) maxChars = 13
    if (text.length > 40) maxChars = 16

    const lines = wrapText(text, maxChars)

    const longestLine = Math.max(...lines.map(l => l.length), 1)

    const fontSizeHorizontal = Math.floor(5000 / longestLine)
    const fontSizeVertical = Math.floor(420 / lines.length)

    let fontSize = Math.min(fontSizeHorizontal, fontSizeVertical, 95)
    fontSize = Math.max(fontSize, 35)

    const dyValue = `${(fontSize * 1.05).toFixed(0)}px`

    const svgText = lines
      .map((line, index) => `<tspan x="25" dy="${index === 0 ? '0' : dyValue}">${line}</tspan>`)
      .join('')

    const svgBuffer = Buffer.from(`
      <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <style>
          .text {
            font-family: 'Arial', sans-serif;
            font-size: ${fontSize}px;
            font-weight: bold;
            fill: black;
            letter-spacing: -2px;
          }
        </style>
        <rect width="100%" height="100%" fill="white"/>
        <text x="25" y="${fontSize + 25}" class="text">
          ${svgText}
        </text>
      </svg>
    `)

    const buffer = await sharp(svgBuffer)
      .resize(512, 512)
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