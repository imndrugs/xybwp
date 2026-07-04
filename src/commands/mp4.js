import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { execSync } from 'child_process'
import { tmpdir } from 'os'
import { writeFileSync, unlinkSync, readFileSync, existsSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import webpmux from 'node-webpmux'
const { Image } = webpmux

export default async function handler(conn, m) {
  const jid = m.chat || m.key?.remoteJid || ''

  const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
  if (!quotedMsg?.stickerMessage) {
    return conn.sendMessage(jid, {
      text: 'Responde a un sticker animado con .mp4'
    }, { quoted: m })
  }

  try {
    const mediaMsg = { message: { stickerMessage: quotedMsg.stickerMessage } }
    const buffer = await downloadMediaMessage(mediaMsg, 'buffer', {})
    if (!buffer || buffer.length < 50) throw new Error('Sticker vacío o corrupto')

    const ts = Date.now()
    const tmpDir = join(tmpdir(), `mp4_${ts}`)
    mkdirSync(tmpDir, { recursive: true })

    const img = new Image()
    await img.load(buffer)

    if (!img.loaded) throw new Error('No se pudo cargar el WebP')

    let frames = []
    if (img.hasAnim) {
      const rawFrames = await img.demux({ buffers: true })
      frames = rawFrames.map((buf, i) => ({
        buffer: buf,
        delay: (img.frames[i]?.delay || 100) / 1000
      }))
    } else {
      frames = [{ buffer, delay: 0.1 }]
    }

    const frameFiles = []
    for (let i = 0; i < frames.length; i++) {
      const webpPath = join(tmpDir, `f_${String(i).padStart(3, '0')}.webp`)
      const pngPath = join(tmpDir, `f_${String(i).padStart(3, '0')}.png`)
      writeFileSync(webpPath, frames[i].buffer)
      execSync(`ffmpeg -y -i "${webpPath}" "${pngPath}"`, { timeout: 15000, stdio: 'pipe' })
      frameFiles.push(pngPath)
    }

    // Calculate framerate from delays
    const avgDelay = frames.reduce((a, f) => a + f.delay, 0) / frames.length
    const fps = Math.round(1 / avgDelay)

    const tmpOutput = join(tmpdir(), `${ts}.mp4`)
    const inputPattern = join(tmpDir, 'f_%03d.png')
    execSync(`ffmpeg -y -framerate ${fps} -i "${inputPattern}" -c:v libx264 -pix_fmt yuv420p -an "${tmpOutput}"`, { timeout: 60000, stdio: 'pipe' })

    if (!existsSync(tmpOutput) || readFileSync(tmpOutput).length < 200) {
      throw new Error('El MP4 generado está vacío')
    }

    const mp4Buffer = readFileSync(tmpOutput)
    await conn.sendMessage(jid, { video: mp4Buffer, caption: 'Sticker animado convertido' }, { quoted: m })

    // Cleanup
    try {
      for (const f of [...frameFiles, ...frameFiles.map(p => p.replace('.png', '.webp'))]) {
        try { unlinkSync(f) } catch {}
      }
      unlinkSync(tmpOutput)
      try { rmSync(tmpDir, { recursive: true }) } catch {}
    } catch {}

  } catch (e) {
    console.error(e)
    await conn.sendMessage(jid, { text: `No pude convertir el sticker: ${e.message}` }, { quoted: m })
  }
}
