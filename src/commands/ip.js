import axios from 'axios'

export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  const ip = args[0] || ''

  try {
    const url = ip ? `http://ip-api.com/json/${encodeURIComponent(ip)}` : 'http://ip-api.com/json/'
    const res = await axios.get(url, { timeout: 10000 })
    const d = res.data
    if (d?.status === 'success') {
      conn.sendMessage(chat, {
        text: `🌐 *IP Info*\n\n*IP:* ${d.query}\n*País:* ${d.country}\n*Región:* ${d.regionName}\n*Ciudad:* ${d.city}\n*ISP:* ${d.isp || 'N/A'}\n*Lat:* ${d.lat}\n*Lon:* ${d.lon}\n\n*CKV BOT*`
      }, { quoted: m })
    } else {
      throw new Error('No encontrada')
    }
  } catch {
    conn.sendMessage(chat, { text: '❌ No pude obtener info de la IP' }, { quoted: m })
  }
}
