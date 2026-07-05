export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''

  const quotedMsg = m.message?.extendedTextMessage?.contextInfo
  const quotedText = quotedMsg?.quotedMessage?.conversation
    || quotedMsg?.quotedMessage?.extendedTextMessage?.text
    || quotedMsg?.quotedMessage?.imageMessage?.caption
    || quotedMsg?.quotedMessage?.videoMessage?.caption
    || null

  let text
  if (args.length) {
    text = args.join(' ')
  } else if (quotedText) {
    text = quotedText
  } else {
    return conn.sendMessage(jid, {
      text: '✏️ Uso: .n <texto> o responde a un mensaje con .n'
    }, { quoted: m })
  }

  const groupMetadata = await conn.groupMetadata(jid).catch(() => null)
  if (!groupMetadata) {
    return conn.sendMessage(jid, {
      text: '⚠️ Solo funciona en grupos'
    }, { quoted: m })
  }

  const botJid = conn.user?.id || conn.user?.jid || ''
  const participants = groupMetadata.participants || []
  const mentions = participants
    .filter(p => p.id !== botJid)
    .map(p => p.id)

  await conn.sendMessage(jid, { text, mentions }, { quoted: m })
}
