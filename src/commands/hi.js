import fetch from 'node-fetch'

function normalize(jid) {
  if (!jid) return ''
  return jid.split('@')[0].split(':')[0] + '@s.whatsapp.net'
}

function getName(conn, db, jid) {
  const key = normalize(jid)
  const contact = conn.contacts?.[key]
  if (contact) return contact.notify || contact.name || contact.pushName || null
  return db?.contacts?.[key] || null
}

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''
  const senderJid = normalize(m.key?.participant || m.key?.remoteJid)

  if (!db.contacts) db.contacts = {}
  if (!conn.contacts) conn.contacts = {}
  conn.contacts[senderJid] = conn.contacts[senderJid] || { id: senderJid, notify: m.pushName, name: m.pushName }
  db.contacts[senderJid] = db.contacts[senderJid] || m.pushName

  const senderName = getName(conn, db, senderJid) || senderJid.split('@')[0] || 'Alguien'

  try {
    const res = await fetch('https://g.tenor.com/v1/search?q=anime+hello&key=LIVDSRZULELA&limit=20')
    const json = await res.json()
    if (!json.results?.length) throw new Error('Sin resultados')
    const gifs = json.results.filter(r => r.media?.[0]?.mp4?.url)
    if (!gifs.length) throw new Error('Sin resultados')
    const random = gifs[Math.floor(Math.random() * gifs.length)]
    const mp4Url = random.media[0].mp4.url

    await conn.sendMessage(jid, {
      video: { url: mp4Url },
      gifPlayback: true,
      caption: `👋 ${senderName} dice hola`
    }, { quoted: m })
  } catch (err) {
    console.error('Error en hi:', err)
    await conn.sendMessage(jid, {
      text: '❌ No pude obtener un GIF. Inténtalo de nuevo.'
    }, { quoted: m })
  }
}
