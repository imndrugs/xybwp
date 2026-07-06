import sharp from 'sharp'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import fs from 'fs'
import path from 'path'

export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid

  const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
  const mediaMessage = quotedMsg?.imageMessage ? { message: { imageMessage: quotedMsg.imageMessage }, key: { id: m.key?.id } } : null

  if (!mediaMessage) {
    return conn.sendMessage(chat, { text: '⚠️ Responde a una imagen con .globo' }, { quoted: m })
  }

  await conn.sendMessage(chat, { text: '⏳ Procesando...' }, { quoted: m })

  try {
    const buffer = await downloadMediaMessage(mediaMessage, 'buffer', {})
    const tmp = path.join(process.cwd(), 'temp')
    if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true })
    const inputPath = path.join(tmp, `globo_in_${Date.now()}.jpg`)
    const outputPath = path.join(tmp, `globo_out_${Date.now()}.jpg`)
    fs.writeFileSync(inputPath, buffer)

    const text = args.join(' ') || '...'
    const maxChars = 40
    const words = text.split(' ')
    const lines = []
    let current = ''
    for (const word of words) {
      if ((current + ' ' + word).trim().length <= maxChars) {
        current = (current + ' ' + word).trim()
      } else {
        if (current) lines.push(current)
        current = word
      }
    }
    if (current) lines.push(current)

    const lineH = 30
    const padX = 20
    const padY = 15
    const bubbleH = lines.length * lineH + padY * 2
    const svgWidth = 600

    const svgLines = lines.map((l, i) =>
      `<tspan x="${svgWidth / 2}" dy="${i === 0 ? 0 : lineH}">${escXml(l)}</tspan>`
    ).join('')

    const svg = Buffer.from(`<svg width="${svgWidth}" height="${bubbleH}">
      <rect x="0" y="0" width="${svgWidth}" height="${bubbleH}" rx="15" ry="15" fill="white" stroke="#333" stroke-width="3"/>
      <text x="${svgWidth / 2}" y="${padY + lineH - 5}" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="black">${svgLines}</text>
    </svg>`)

    const img = sharp(inputPath)
    const meta = await img.metadata()
    const newH = meta.height + bubbleH + 10
    const bg = await sharp({
      create: { width: Math.max(meta.width, svgWidth), height: newH, channels: 3, background: { r: 255, g: 255, b: 255 } }
    })
      .composite([
        { input: svg, top: 0, left: Math.max(0, Math.floor((Math.max(meta.width, svgWidth) - svgWidth) / 2)) },
        { input: inputPath, top: bubbleH + 10, left: 0 }
      ])
      .jpeg({ quality: 90 })
      .toFile(outputPath)

    await conn.sendMessage(chat, { image: { url: outputPath }, caption: '💬 *CKV BOT*' }, { quoted: m })
    try { fs.unlinkSync(inputPath) } catch {}
    try { fs.unlinkSync(outputPath) } catch {}
  } catch (e) {
    conn.sendMessage(chat, { text: `❌ Error: ${e.message}` }, { quoted: m })
  }
}

function escXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
