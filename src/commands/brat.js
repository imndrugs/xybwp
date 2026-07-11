import axios from 'axios'
import sharp from 'sharp'
import { makeSticker } from '../lib/sticker.js'
import { getSenderId } from '../lib/perms.js'

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const fetchSticker = async (text, attempt = 1) => {
  try {
    const response = await axios.get(`https://kepolu-brat.hf.space/brat`, {
      params: { q: text },
      responseType: 'arraybuffer'
    })
    return response.data
  } catch (error) {
    if (error.response?.status === 429 && attempt <= 3) {
      const retryAfter = parseInt(error.response.headers['retry-after'] || '5')
      await delay(retryAfter * 1000)
      return fetchSticker(text, attempt + 1)
    }
    throw error
  }
}

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''
  const sender = getSenderId(m)

  if (!args[0]) {
    return conn.sendMessage(jid, { text: '✏️ Uso: .brat <texto>\n\nEjemplo: .brat hola' }, { quoted: m })
  }

  try {
    const text = args.join(' ')
    let buffer = await fetchSticker(text)

    const { dominant } = await sharp(buffer).stats()
    buffer = await sharp(buffer)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: dominant.r, g: dominant.g, b: dominant.b, alpha: 1 }
      })
      .png()
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
