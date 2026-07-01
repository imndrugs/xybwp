import fetch from 'node-fetch'

const actionTexts = [
  'ha besado a',
  'le ha dado un beso a',
  'ha lanzado un beso a'
]

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

  const context = m.message?.extendedTextMessage?.contextInfo
  let targetRaw = context?.participant || context?.mentionedJid?.[0]

  if (!targetRaw) {
    return conn.sendMessage(jid, {
      text: '💋 Responde a un mensaje o menciona a alguien para darle un beso.'
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
        console.log('PARTICIPANT:', JSON.stringify({ id: p.id, key, notify: p.notify, pushName: p.pushName, name: p.name, admin: p.admin, verifiedName: p.verifiedName }))
        const name = p.notify || p.pushName || p.name || p.verifiedName || key.split('@')[0]
        if (name) {
          conn.contacts[key] = { id: key, notify: name, name: name }
          db.contacts[key] = name
        }
      }
    }
  }

  console.log('TARGET:', { raw: targetRaw, normalized: target })
  console.log('SENDER:', { jid: senderJid, pushName: m.pushName })
  console.log('CONTACTS:', { inConn: !!conn.contacts?.[target], inDb: !!db.contacts?.[target], connKeys: Object.keys(conn.contacts || {}).slice(0, 5) })

  const senderName = getName(conn, db, senderJid) || senderJid.split('@')[0] || 'Alguien'
  const targetName = getName(conn, db, target) || target.split('@')[0]

  const action = actionTexts[Math.floor(Math.random() * actionTexts.length)]

  try {
    const res = await fetch('https://g.tenor.com/v1/search?q=anime+kiss&key=LIVDSRZULELA&limit=20')
    const json = await res.json()

    if (!json.results?.length) throw new Error('Sin resultados')

    const gifs = json.results.filter(r => r.media?.[0]?.mp4?.url)
    if (!gifs.length) throw new Error('Sin resultados')

    const random = gifs[Math.floor(Math.random() * gifs.length)]
    const mp4Url = random.media[0].mp4.url

    await conn.sendMessage(jid, {
      video: { url: mp4Url },
      gifPlayback: true,
      caption: `💋 ${senderName} ${action} ${targetName}`
    }, { quoted: m })

  } catch (err) {
    console.error('Error en kiss:', err)
    await conn.sendMessage(jid, {
      text: '❌ No pude obtener un GIF de beso. Inténtalo de nuevo.'
    }, { quoted: m })
  }
}
