import fetch from 'node-fetch'
import { execSync } from 'child_process'
import { tmpdir } from 'os'
import { writeFileSync, unlinkSync, readFileSync } from 'fs'
import { join } from 'path'

const NEKOS_ENDPOINTS = {
  kiss: 'https://nekos.life/api/v2/img/kiss',
  hug: 'https://nekos.life/api/v2/img/hug',
  slap: 'https://nekos.life/api/v2/img/slap',
  pat: 'https://nekos.life/api/v2/img/pat',
  tickle: 'https://nekos.life/api/v2/img/tickle',
}

export async function fetchGifUrl(action) {
  const url = NEKOS_ENDPOINTS[action]
  if (!url) throw new Error(`No endpoint for action: ${action}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} from nekos.life`)
  const json = await res.json()
  if (!json.url) throw new Error('No URL in nekos.life response')
  return json.url
}

export async function gifToMp4(gifUrl) {
  const res = await fetch(gifUrl)
  const buf = Buffer.from(await res.arrayBuffer())
  const tmpGif = join(tmpdir(), `${Date.now()}.gif`)
  const tmpMp4 = join(tmpdir(), `${Date.now()}.mp4`)
  try {
    writeFileSync(tmpGif, buf)
    execSync(
      `ffmpeg -i "${tmpGif}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -f mp4 "${tmpMp4}" -y`,
      { timeout: 15000 }
    )
    return readFileSync(tmpMp4)
  } finally {
    try { unlinkSync(tmpGif) } catch {}
    try { unlinkSync(tmpMp4) } catch {}
  }
}

export async function sendAnimeGif(conn, jid, action, caption, quoted) {
  const gifUrl = await fetchGifUrl(action)
  const mp4 = await gifToMp4(gifUrl)
  await conn.sendMessage(jid, { video: mp4, gifPlayback: true, caption }, { quoted })
}
