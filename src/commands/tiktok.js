import fetch from "node-fetch"
import { execFileSync } from "child_process"
import { tmpdir } from "os"
import { writeFileSync, unlinkSync, readFileSync, existsSync, readdirSync } from "fs"
import { join } from "path"
import { socialkitDownload } from '../lib/socialkit.js'

const YT_DLP = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
const HAS_YTDLP = (() => {
  try { execFileSync(YT_DLP, ['--version'], { stdio: 'pipe' }); return true }
  catch { return false }
})()

async function fetchWithTimeout(url, options = {}, ms = 10000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...options, signal: ctrl.signal })
  } finally { clearTimeout(timer) }
}

function isValidMp4(p) {
  try { return readFileSync(p).slice(4, 8).toString() === 'ftyp' } catch { return false }
}

function findFile(prefix, exts) {
  const dir = tmpdir()
  for (const f of readdirSync(dir).filter(f => f.startsWith(prefix))) {
    for (const e of exts) {
      if (f.includes(e.replace('.', '')) || f.endsWith(e)) {
        try { const p = join(dir, f); if (readFileSync(p).length > 5000) return p } catch {}
      }
    }
  }
  return null
}

async function downloadToTemp(url, ext) {
  const ts = Date.now()
  const fp = join(tmpdir(), `tt_${ts}${ext || ''}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  writeFileSync(fp, Buffer.from(await res.arrayBuffer()))
  return { path: fp, size: existsSync(fp) ? readFileSync(fp).length : 0 }
}

// --- yt-dlp ---
async function tryYtDlp(url) {
  try {
    const ts = Date.now()
    execFileSync(YT_DLP, [
      '--no-playlist', '-o', join(tmpdir(), `tt_v_${ts}_%(ext)s`), url
    ], { timeout: 120000, stdio: 'pipe' })
    return findFile(`tt_v_${ts}`, ['.mp4', '.webm', '.mkv'])
  } catch (e) { console.log('yt-dlp fail:', e.message) }
  return null
}

async function tryAudio(url) {
  try {
    const ts = Date.now()
    execFileSync(YT_DLP, [
      '-x', '--audio-format', 'mp3', '--no-playlist',
      '-o', join(tmpdir(), `tt_a_${ts}_%(ext)s`), url
    ], { timeout: 60000, stdio: 'pipe' })
    return findFile(`tt_a_${ts}`, ['.mp3', '.webm', '.m4a', '.opus'])
  } catch {}
  return null
}

// --- Scraper: TikTok API + HTML + meta tags ---
function extractItemId(url) {
  const m = url.match(/\/(?:video|photo)\/(\d+)/)
  return m ? m[1] : ''
}

async function scrapeTikTok(url) {
  const itemId = extractItemId(url)
  if (!itemId) return null

  // 1) TikTok internal API
  try {
    const res = await fetchWithTimeout(
      `https://www.tiktok.com/api/item/detail/?itemId=${itemId}&aid=1988`,
      { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.tiktok.com/' } }
    )
    if (res.ok) {
      const json = await res.json()
      const item = json?.itemInfo?.itemStruct
      if (item) {
        const images = (item.imagePost?.images || []).map(i => i?.imageURL?.urlList?.[0]).filter(Boolean)
        const music = item.music?.playUrl || item.music?.audio?.url || ''
        const video = item.video?.playAddr?.[0] || item.video?.downloadAddr || ''
        if (images.length || video) return { images, video, music }
      }
    }
  } catch (e) { console.log('API directa:', e.message) }

  // 2) Scrape HTML
  try {
    const res = await fetchWithTimeout(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
    if (res.ok) {
      const html = await res.text()

      // SIGI_STATE / __NEXT_DATA__ / __INITIAL_STATE__
      for (const pat of [
        /<script[^>]*>window\.SIGI_STATE\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/,
        /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
        /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});?/
      ]) {
        const m = html.match(pat)
        if (m) {
          try {
            const data = JSON.parse(m[1])
            const all = JSON.stringify(data)
            const urls = [...all.matchAll(/"displaySrc"\s*:\s*"([^"]+)"/g)].map(x => x[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/'))
            const unique = [...new Set(urls)]
            if (unique.length) return { images: unique, video: '', music: '' }
          } catch {}
        }
      }

      // og:image meta tag
      const og = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/)
      if (og) return { images: [og[1]], video: '', music: '' }
    }
  } catch (e) { console.log('HTML scrape:', e.message) }

  return null
}

// --- APIs externas ---
async function tryApi(url) {
  for (const api of [
    `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`,
    `https://g-mini-ia.vercel.app/api/tiktok?url=${encodeURIComponent(url)}`
  ]) {
    try {
      const res = await fetchWithTimeout(api, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      if (!res.ok) { console.log(`${api.split('/')[2]}: HTTP ${res.status}`); continue }
      const json = await res.json()
      // tikwm format
      if (json?.code === 0 && json?.data) {
        const d = json.data
        if (d.images?.length || d.play) return { images: d.images || [], video: d.play || d.wmplay || '', music: d.music || '' }
      }
      // g-mini-ia format
      const images = json?.images || json?.image_urls || []
      const video = json?.video_url || json?.video || ''
      const music = json?.music?.playUrl || json?.music?.url || ''
      if (images.length || video) return { images, video, music }
      console.log(`${api.split('/')[2]}: sin datos`)
    } catch (e) { console.log(`${api.split('/')[2]}:`, e.message) }
  }
  return null
}

// --- Handler ---
export default async function handler(conn, m, args) {
  const jid = m.key?.remoteJid || m.chat
  let url = args[0]
  if (!url) return conn.sendMessage(jid, { text: '📌 Envía un link de TikTok' }, { quoted: m })

  // Resolver vt.tiktok.com y limpiar
  if (/vt\.tiktok\.com/i.test(url)) {
    try {
      const r = await fetch(url, { method: 'HEAD', redirect: 'follow', timeout: 10000 })
      url = r.url || url
    } catch {}
  }
  url = url.split('?')[0]
  console.log('URL:', url)

  await conn.sendMessage(jid, { text: '⏬ Descargando...' }, { quoted: m })

  // 1) SocialKit
  const sk = await socialkitDownload('tiktok', url)
  if (sk?.images?.length) {
    for (let i = 0; i < sk.images.length; i++) {
      try { await conn.sendMessage(jid, { image: { url: sk.images[i] }, caption: `📸 ${i + 1}/${sk.images.length}` }, { quoted: m }) } catch {}
    }
    if (sk.music) { try { const a = await downloadToTemp(sk.music, '.mp3'); if (a.size > 5000) await conn.sendMessage(jid, { audio: readFileSync(a.path), mimetype: 'audio/mpeg' }, { quoted: m }); unlinkSync(a.path) } catch {} }
    return
  }
  if (sk?.downloadUrl) {
    try { const f = await downloadToTemp(sk.downloadUrl, '.mp4'); if (f.size > 10000 && isValidMp4(f.path)) { await conn.sendMessage(jid, { video: readFileSync(f.path), caption: '🎬 TikTok' }, { quoted: m }); unlinkSync(f.path); return } unlinkSync(f.path) } catch {}
  }

  // 2) Scraper directo
  const sc = await scrapeTikTok(url)
  if (sc?.images?.length) {
    for (let i = 0; i < sc.images.length; i++) {
      try { await conn.sendMessage(jid, { image: { url: sc.images[i] }, caption: `📸 ${i + 1}/${sc.images.length}` }, { quoted: m }) } catch {}
    }
    if (sc.music) { try { const a = await downloadToTemp(sc.music, '.mp3'); if (a.size > 5000) await conn.sendMessage(jid, { audio: readFileSync(a.path), mimetype: 'audio/mpeg' }, { quoted: m }); unlinkSync(a.path) } catch {} }
    return
  }
  if (sc?.video) {
    try { const f = await downloadToTemp(sc.video, '.mp4'); if (f.size > 10000 && isValidMp4(f.path)) { await conn.sendMessage(jid, { video: readFileSync(f.path), caption: '🎬 TikTok' }, { quoted: m }); unlinkSync(f.path); return } unlinkSync(f.path) } catch {}
  }

  // 3) yt-dlp
  if (HAS_YTDLP) {
    const yt = await tryYtDlp(url)
    if (yt) {
      try { await conn.sendMessage(jid, { video: readFileSync(yt), caption: '🎬 TikTok' }, { quoted: m }); unlinkSync(yt); return } catch { unlinkSync(yt) }
    }
  }

  // 4) APIs externas
  const ap = await tryApi(url)
  if (ap?.images?.length) {
    for (let i = 0; i < ap.images.length; i++) {
      try { await conn.sendMessage(jid, { image: { url: ap.images[i] }, caption: `📸 ${i + 1}/${ap.images.length}` }, { quoted: m }) } catch {}
    }
    if (ap.music) { try { const a = await downloadToTemp(ap.music, '.mp3'); if (a.size > 5000) await conn.sendMessage(jid, { audio: readFileSync(a.path), mimetype: 'audio/mpeg' }, { quoted: m }); unlinkSync(a.path) } catch {} }
    return
  }
  if (ap?.video) {
    try { const f = await downloadToTemp(ap.video, '.mp4'); if (f.size > 10000 && isValidMp4(f.path)) { await conn.sendMessage(jid, { video: readFileSync(f.path), caption: '🎬 TikTok' }, { quoted: m }); unlinkSync(f.path); return } unlinkSync(f.path) } catch {}
  }

  // 5) Solo audio
  if (HAS_YTDLP) {
    const a = await tryAudio(url)
    if (a) {
      try { await conn.sendMessage(jid, { audio: readFileSync(a), mimetype: 'audio/mpeg' }, { quoted: m }) } catch {}
      unlinkSync(a)
      return
    }
  }

  return conn.sendMessage(jid, { text: '❌ No se pudo descargar — el enlace puede ser privado o requerir cookies' }, { quoted: m })
}
