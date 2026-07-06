import axios from 'axios'

export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  const url = args[0]
  if (!url?.includes('mediafire.com')) {
    return conn.sendMessage(chat, { text: '⚠️ Uso: .mediafire <link de MediaFire>' }, { quoted: m })
  }

  await conn.sendMessage(chat, { text: '⏳ Obteniendo enlace...' }, { quoted: m })

  try {
    const res = await axios.get(`https://api.mediafire-download.com/v1/mediafire?url=${encodeURIComponent(url)}`, { timeout: 15000 })
    const dl = res?.data?.url || res?.data?.download
    const name = res?.data?.name || 'archivo'
    if (dl) {
      conn.sendMessage(chat, { text: `📁 *${name}*\n🔗 ${dl}\n\n*CKV BOT*` }, { quoted: m })
    } else {
      throw new Error('No encontrado')
    }
  } catch {
    conn.sendMessage(chat, { text: '❌ No pude obtener el enlace' }, { quoted: m })
  }
}
