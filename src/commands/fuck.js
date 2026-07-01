import fetch from 'node-fetch'
import { execSync } from 'child_process'
import { tmpdir } from 'os'
import { writeFileSync, unlinkSync, readFileSync } from 'fs'
import { join } from 'path'

const actionTexts = ['se ha follado a', 'le ha dado duro a', 'ha cogido a']

const endpoints = ['https://nekobot.xyz/api/image?type=hentai']

function normalize(jid) {
  if (!jid) return ''
  return jid.split('@')[0].split(':')[0] + '@s.whatsapp.net'
}

async function gifToMp4(url) {
  const res = await fetch(url)
  const buf = Buffer.from(await res.arrayBuffer())
  const tmpGif = join(tmpdir(), `${Date.now()}.gif`)
  const tmpMp4 = join(tmpdir(), `${Date.now()}.mp4`)
  try {
    writeFileSync(tmpGif, buf)
    execSync(`ffmpeg -i "${tmpGif}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -f mp4 "${tmpMp4}" -y`, { timeout: 15000 })
    return readFileSync(tmpMp4)
  } finally {
    try { unlinkSync(tmpGif) } catch {}
    try { unlinkSync(tmpMp4) } catch {}
  }
}

async function sendMedia(conn, jid, url, caption, quoted) {
  if (url.match(/\.gif($|\?)/i)) {
    const mp4 = await gifToMp4(url)
    await conn.sendMessage(jid, { video: mp4, gifPlayback: true, caption }, { quoted })
  } else {
    await conn.sendMessage(jid, { image: { url }, caption }, { quoted })
  }
}

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''
  const ctx = m.message?.extendedTextMessage?.contextInfo
  let target = ctx?.participant || ctx?.mentionedJid?.[0]
  if (!target) return conn.sendMessage(jid, { text: '🔞 Responde o menciona a alguien.' }, { quoted: m })

  target = normalize(target)
  const sender = normalize(m.key?.participant || m.key?.remoteJid)
  const sName = conn.contacts?.[sender]?.notify || db?.contacts?.[sender] || sender.split('@')[0] || 'Alguien'
  const tName = conn.contacts?.[target]?.notify || db?.contacts?.[target] || target.split('@')[0]
  const action = actionTexts[Math.floor(Math.random() * actionTexts.length)]

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep)
      const json = await res.json()
      const url = json.link || json.url || json.message
      if (!url) continue
      await sendMedia(conn, jid, url, `🔞 ${sName} ${action} ${tName}`, m)
      return
    } catch {}
  }
  await conn.sendMessage(jid, { text: '❌ Error al obtener imagen.' }, { quoted: m })
}
