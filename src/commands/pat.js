import fetch from 'node-fetch'

const actionTexts = [
  'le ha dado palmaditas a',
  'ha acariciado la cabeza de',
  'le ha hecho cariñitos a'
]

function normalize(jid) {
  if (!jid) return ''
  return jid.split('@')[0].split(':')[0] + '@s.whatsapp.net'
}

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''
  const context = m.message?.extendedTextMessage?.contextInfo
  let targetRaw = context?.participant || context?.mentionedJid?.[0]

  if (!targetRaw) {
    return conn.sendMessage(jid, {
      text: '🖐️ Responde a alguien o menciónalo para darle palmaditas.'
    }, { quoted: m })
  }

  const target = normalize(targetRaw)
  const senderJid = normalize(m.key?.participant || m.key?.remoteJid)

  if (!db.contacts) db.contacts = {}
  if (!conn.contacts) conn.contacts = {}

  conn.contacts[senderJid] = conn.contacts[senderJid] || { id: senderJid, notify: m.pushName, name: m.pushName }
  db.contacts[senderJid] = db.contacts[senderJid] || m.pushName

  if (!conn.contacts[target] && !db.contacts[target]) {
    const metadata = await conn.groupMetadata(jid).catch(() => null)
    if (metadata) {
      for (const p of metadata.participants) {
        const key = normalize(p.id)
        const name = p.notify || p.pushName || p.name || p.verifiedName
        if (name) {
          conn.contacts[key] = { id: key, notify: name, name: name }
          db.contacts[key] = name
        }
      }
    }
  }

  const senderName = conn.contacts[senderJid]?.notify || db.contacts[senderJid] || senderJid.split('@')[0] || 'Alguien'
  const targetName = conn.contacts[target]?.notify || db.contacts[target] || target.split('@')[0]
  const action = actionTexts[Math.floor(Math.random() * actionTexts.length)]

  try {
    const res = await fetch('https://g.tenor.com/v1/search?q=anime+pat&key=LIVDSRZULELA&limit=20')
    const json = await res.json()
    if (!json.results?.length) throw new Error('Sin resultados')
    const gifs = json.results.filter(r => r.media?.[0]?.mp4?.url)
    if (!gifs.length) throw new Error('Sin resultados')
    const random = gifs[Math.floor(Math.random() * gifs.length)]
    await conn.sendMessage(jid, {
      video: { url: random.media[0].mp4.url },
      gifPlayback: true,
      caption: `🖐️ ${senderName} ${action} ${targetName}`
    }, { quoted: m })
  } catch (err) {
    console.error('Error en pat:', err)
    await conn.sendMessage(jid, { text: '❌ No pude obtener el GIF.' }, { quoted: m })
  }
}
