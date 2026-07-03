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

// Write YouTube cookies from env var if available
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
  } catch (e) {
    console.log('Oceansaver error:', e.message)
  }
  return null
}

function getYtDlpBaseArgs(url) {
  const args = ['--no-playlist']
  // Try android client (no JS runtime needed)
  args.push('--extractor-args', 'youtube:player_client=android')
  // Use cookies if available
  if (existsSync(YT_COOKIE_PATH)) {
    args.push('--cookies', YT_COOKIE_PATH)
  }
  return args
}

async function downloadAudio(url) {
  const ts = Date.now()
  const outputPath = join(TEMP_DIR, `play_${ts}.%(ext)s`)
  const args = [
    ...getYtDlpBaseArgs(url),
    '-f', 'bestaudio[ext=m4a]/bestaudio',
    '--extract-audio', '--audio-format', 'mp3',
    '-o', outputPath,
    url
  ]
  await execFileAsync(YT_DLP, args, { timeout: 120000 })
  const file = join(TEMP_DIR, `play_${ts}.mp3`)
  if (!existsSync(file)) throw new Error('No se generó el archivo de audio')
  return file
}

async function downloadVideo(url) {
  const ts = Date.now()
  const outputPath = join(TEMP_DIR, `play_v_${ts}.%(ext)s`)
  const args = [
    ...getYtDlpBaseArgs(url),
    '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]',
    '--merge-output-format', 'mp4',
    '-o', outputPath,
    url
  ]
  await execFileAsync(YT_DLP, args, { timeout: 180000 })
  const file = join(TEMP_DIR, `play_v_${ts}.mp4`)
  if (!existsSync(file)) throw new Error('No se generó el archivo de video')
  return file
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
        await conn.sendMessage(jid, { text: `❌ Error video: ${e.message}` }, { quoted: m })
      }
      return
    }

    await conn.sendMessage(jid, { text: `${infoText}\n\n⬇️ Descargando audio...` }, { quoted: m })

    // Try oceansaver first (direct URL, no file needed, bypasses bot detection)
    let sent = false
    const dlUrl = await tryOceansaver(video.url)
    if (dlUrl) {
      try {
        await conn.sendMessage(jid, {
          audio: { url: dlUrl },
          mimetype: 'audio/mpeg',
          fileName: `${video.title}.mp3`
        }, { quoted: m })
        sent = true
        console.log('Audio descargado via oceansaver')
      } catch (e) {
        console.log('Oceansaver send error:', e.message)
      }
    }

    // Fallback to yt-dlp
    if (!sent) {
      console.log('Usando yt-dlp como fallback')
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
    await conn.sendMessage(jid, { text: `❌ Error: ${e.message}\n\nPrueba .ytcookies para configurar cookies de YouTube` }, { quoted: m })
  }
}
