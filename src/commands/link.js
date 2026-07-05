export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''
  const groupMetadata = await conn.groupMetadata(jid).catch(() => null)

  if (!groupMetadata) {
    return conn.sendMessage(jid, { text: '⚠️ Este comando solo funciona en grupos' }, { quoted: m })
  }

  try {
    const link = 'https://chat.whatsapp.com/' + await conn.groupInviteCode(jid)
    const totalMembers = groupMetadata.participants.length

    const message = `🔗 *${groupMetadata.subject}*\n👥 ${totalMembers} miembros\n\n${link}\n\n*CKV BOT*`

    await conn.sendMessage(jid, { text: message }, { quoted: m, detectLink: true })
  } catch (error) {
    console.error(error)
    await conn.sendMessage(jid, { text: '❌ No pude obtener el link del grupo' }, { quoted: m })
  }
}
