import axios from 'axios'

export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  let url = args[0]
  if (!url?.includes('mediafire.com')) {
    return conn.sendMessage(chat, { text: '⚠️ *Uso:* .mediafire <link de MediaFire>\n\n📌 *Ejemplo:*\n• .mediafire https://www.mediafire.com/file/xxx/nombre.zip/file' }, { quoted: m })
  }

  await conn.sendMessage(chat, { text: '⏳ Obteniendo enlace...' }, { quoted: m })

  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 15000
    })

    let dlUrl = ''
    const match = data.match(/href="(https:\/\/download[^"]+)"/)
    if (match) dlUrl = match[1].replace(/&amp;/g, '&')

    if (!dlUrl) {
      const match2 = data.match(/aria-label="Download file".*?href="([^"]+)"/)
      if (match2) dlUrl = match2[1].replace(/&amp;/g, '&')
    }

    if (!dlUrl) {
      const match3 = data.match(/id="downloadButton".*?href="([^"]+)"/)
      if (match3) dlUrl = match3[1].replace(/&amp;/g, '&')
    }

    if (!dlUrl) throw new Error('No se encontró link de descarga')

    const nameMatch = data.match(/<title>(.*?)<\/title>/)
    const name = nameMatch ? nameMatch[1].replace('MediaFire', '').replace(/[-|]/g, '').trim() : 'Archivo'

    await conn.sendMessage(chat, { text: `📁 *${name || 'Archivo'}*\n🔗 ${dlUrl}\n\n*CKV BOT*` }, { quoted: m })
  } catch (e) {
    conn.sendMessage(chat, { text: `❌ No pude obtener el enlace\n• ${e.message?.slice(0, 100) || 'error'}` }, { quoted: m })
  }
}
