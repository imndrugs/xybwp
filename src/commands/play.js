import yts from 'yt-search'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { tmpdir } from 'os'
import { join } from 'path'
import { writeFileSync, unlinkSync, readFileSync, existsSync, mkdirSync } from 'fs'

const execFileAsync = promisify(execFile)
const YT_DLP = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
const TEMP_DIR = join(tmpdir(), 'bot_play')
const YT_COOKIE_PATH = 'src/youtube_cookies.txt'

if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true })

if (process.env.YOUTUBE_COOKIES && !existsSync(YT_COOKIE_PATH)) {
  try { writeFileSync(YT_COOKIE_PATH, process.env.YOUTUBE_COOKIES) } catch {}
}

function formatTime(seconds) {
  if (!seconds) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function formatViews(n) {
  if (!n || isNaN(n)) return '?'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

async function searchYT(query) {
  const result = await yts(query)
  return result.videos?.[0] || null
}

async function tryOceansaver(url) {
  try {
    const initResp = await fetch(
      `https://p.oceansaver.in/ajax/download.php?format=mp3&url=${encodeURIComponent(url)}&api=dfcb6d76f2f6a9894gjkege8a4ab232222`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) }
    )
    const initData = await initResp.json()
    if (!initData?.success) return null

    for (let i = 0; i < 20; i++) {
      const progResp = await fetch(`https://p.oceansaver.in/ajax/progress.php?id=${initData.id}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) }
      )
      const progData = await progResp.json()
      if (progData?.success && progData.progress === 1000) return progData.download_url
      await new Promise(r => setTimeout(r, 3000))
    }
  } catch {}
  return null
}

async function downloadAudio(url) {
  const ts = Date.now()
  const hasCookies = existsSync(YT_COOKIE_PATH)

  // Strategy 1: Android client — no cookies needed, no JS runtime needed
  const out1 = join(TEMP_DIR, `play_${ts}.%(ext)s`)
  try {
    const args = [
      '--no-playlist',
      '--extractor-args', 'youtube:player_client=android',
      '-f', 'bestaudio/best',
      '--extract-audio', '--audio-format', 'mp3',
      '-o', out1, url
    ]
    await execFileAsync(YT_DLP, args, { timeout: 120000 })
    const file = join(TEMP_DIR, `play_${ts}.mp3`)
    if (existsSync(file) && readFileSync(file).length > 1000) return file
  } catch {}

  // Strategy 2: Cookies + default client (might warn about JS but try anyway)
  if (hasCookies) {
    const out2 = join(TEMP_DIR, `play_${ts}_c.%(ext)s`)
    try {
      await execFileAsync(YT_DLP, [
        '--no-playlist',
        '--cookies', YT_COOKIE_PATH,
        '-f', 'bestaudio/best',
        '--extract-audio', '--audio-format', 'mp3',
        '-o', out2, url
      ], { timeout: 120000 })
      const file = join(TEMP_DIR, `play_${ts}_c.mp3`)
      if (existsSync(file) && readFileSync(file).length > 1000) return file
    } catch {}
  }

  throw new Error('No se pudo descargar. YouTube está bloqueando el servidor. Usa .ytcookies para configurar cookies')
}

async function downloadVideo(url) {
  const ts = Date.now()
  const hasCookies = existsSync(YT_COOKIE_PATH)

  // Strategy 1: Android
  const out1 = join(TEMP_DIR, `play_v_${ts}.%(ext)s`)
  try {
    await execFileAsync(YT_DLP, [
      '--no-playlist',
      '--extractor-args', 'youtube:player_client=android',
      '-f', 'best[ext=mp4]/best',
      '--merge-output-format', 'mp4',
      '-o', out1, url
    ], { timeout: 180000 })
    const file = join(TEMP_DIR, `play_v_${ts}.mp4`)
    if (existsSync(file) && readFileSync(file).length > 1000) return file
  } catch {}

  // Strategy 2: Cookies
  if (hasCookies) {
    const out2 = join(TEMP_DIR, `play_v_${ts}_c.%(ext)s`)
    try {
      const args = [
        '--no-playlist',
        '-f', 'best[ext=mp4]/best',
        '--merge-output-format', 'mp4',
        '-o', out2, url
      ]
      if (hasCookies) args.push('--cookies', YT_COOKIE_PATH)
      await execFileAsync(YT_DLP, args, { timeout: 180000 })
      const file = join(TEMP_DIR, `play_v_${ts}_c.mp4`)
      if (existsSync(file) && readFileSync(file).length > 1000) return file
    } catch {}
  }

  throw new Error('No se pudo descargar el video')
}

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''
  const text = args.join(' ')

  if (!text) {
    return conn.sendMessage(jid, {
      text: '🎵 *Uso:* .play nombre de la canción\n🎬 *Video:* .play -v nombre\n\nEjemplo: .play despacito'
    }, { quoted: m })
  }

  const wantVideo = args[0] === '-v'
  const query = wantVideo ? args.slice(1).join(' ') : text

  await conn.sendMessage(jid, { text: '🔎 Buscando...' }, { quoted: m })

  try {
    const video = await searchYT(query)
    if (!video) {
      return conn.sendMessage(jid, { text: '❌ No encontré nada con ese nombre' }, { quoted: m })
    }

    const infoText = `🎵 *${video.title}*\n📺 ${video.author?.name || '?'}\n⏱ ${formatTime(video.duration?.seconds || 0)} | 👀 ${formatViews(video.views)}\n🔗 ${video.url}`

    if (wantVideo) {
      await conn.sendMessage(jid, { text: `${infoText}\n\n⬇️ Descargando video...` }, { quoted: m })
      try {
        const filePath = await downloadVideo(video.url)
        const buf = readFileSync(filePath)
        await conn.sendMessage(jid, { video: buf, caption: `🎬 ${video.title}` }, { quoted: m })
        try { unlinkSync(filePath) } catch {}
      } catch (e) {
        await conn.sendMessage(jid, { text: `❌ ${e.message}` }, { quoted: m })
      }
      return
    }

    await conn.sendMessage(jid, { text: `${infoText}\n\n⬇️ Descargando audio...` }, { quoted: m })

    let sent = false

    // Try oceansaver first (no cookies/JS needed)
    const dlUrl = await tryOceansaver(video.url)
    if (dlUrl) {
      try {
        await conn.sendMessage(jid, {
          audio: { url: dlUrl },
          mimetype: 'audio/mpeg',
          fileName: `${video.title}.mp3`
        }, { quoted: m })
        sent = true
      } catch (e) {
        console.log('Oceansaver send error:', e.message)
      }
    }

    // Fallback to yt-dlp
    if (!sent) {
      const filePath = await downloadAudio(video.url)
      const buf = readFileSync(filePath)
      await conn.sendMessage(jid, {
        audio: buf,
        mimetype: 'audio/mpeg',
        fileName: `${video.title}.mp3`
      }, { quoted: m })
      try { unlinkSync(filePath) } catch {}
      sent = true
    }
  } catch (e) {
    console.error(e)
    await conn.sendMessage(jid, { text: `❌ ${e.message}` }, { quoted: m })
  }
}
