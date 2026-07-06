import axios from 'axios'

export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  const text = args.join(' ')
  if (!text) return conn.sendMessage(chat, { text: '⚠️ Uso: .translate <texto>\nEj: .translate Hello world | O usa .translate en reply a un mensaje' }, { quoted: m })

  try {
    const res = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|es`, { timeout: 10000 })
    const translated = res?.data?.responseData?.translatedText
    if (translated) {
      conn.sendMessage(chat, { text: `🌐 *Traducción*\n\n📝 ${translated}\n\n*CKV BOT*` }, { quoted: m })
    } else {
      throw new Error('No traducido')
    }
  } catch {
    conn.sendMessage(chat, { text: '❌ No pude traducir' }, { quoted: m })
  }
}
