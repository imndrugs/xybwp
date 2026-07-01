import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { Sticker } = require('wa-sticker-formatter')

export async function makeSticker(buffer, { packname = 'bot', author = 'bot' } = {}) {
  let mediaBuffer = buffer

  // Convertir streams a Buffer
  if (mediaBuffer?.pipe) {
    const chunks = []
    for await (const chunk of mediaBuffer) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    mediaBuffer = Buffer.concat(chunks)
  } else if (!Buffer.isBuffer(mediaBuffer) && mediaBuffer?.arrayBuffer) {
    mediaBuffer = Buffer.from(await mediaBuffer.arrayBuffer())
  } else if (typeof mediaBuffer === 'string') {
    mediaBuffer = Buffer.from(mediaBuffer)
  }

  try {
    const sticker = new Sticker(mediaBuffer, {
      pack: packname,
      author: author,
      type: 'FULL',
      quality: 100
    })
    return await sticker.toBuffer()
  } catch (error) {
    console.error('Error creating sticker:', error)
    throw error
  }
}
