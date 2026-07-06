export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid
  const text = args.join(' ') || 'Hola'
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(text)}`
  await conn.sendMessage(chat, { image: { url }, caption: `✅ QR generado\n\n*CKV BOT*` }, { quoted: m })
}
