import { clean } from '../lib/perms.js'

export default async function handler(conn, m, args, db) {
  const chat = m.chat || m.key?.remoteJid || ''
  const botJid = conn.user?.id || conn.user?.jid || ''

  let target = null
  const ctx = m.message?.extendedTextMessage?.contextInfo

  if (ctx?.mentionedJid?.length) target = ctx.mentionedJid[0]
  if (!target && ctx?.participant) target = ctx.participant

  if (!target && args.length) {
    const digits = args.join('').replace(/\D/g, '')
    if (digits.length >= 10) target = digits + '@s.whatsapp.net'
    else return conn.sendMessage(chat, { text: '⚠️ Número inválido. Ej: .pfp 525644444644' }, { quoted: m })
  }

  if (!target) target = m.key?.participant || chat

  const targetNum = clean(target)
  if (!targetNum || clean(botJid) === targetNum) {
    return conn.sendMessage(chat, { text: '⚠️ No puedes usar mi foto de perfil' }, { quoted: m })
  }

  async function queryPp(jid, type) {
    try {
      const res = await conn.query({
        tag: 'iq',
        attrs: { target: jid, to: '@s.whatsapp.net', type: 'get', xmlns: 'w:profile:picture' },
        content: [{ tag: 'picture', attrs: { type, query: 'url' } }]
      })
      const children = Array.isArray(res?.content) ? res.content : []
      const pic = children.find(c => c?.tag === 'picture')
      return pic?.attrs?.url || null
    } catch (e) {
      console.log(`pfp query fail ${jid} ${type}:`, e.message)
      return null
    }
  }

  let ppUrl = null
  for (const suffix of ['@s.whatsapp.net', '@c.us']) {
    ppUrl = await queryPp(targetNum + suffix, 'image') || await queryPp(targetNum + suffix, 'preview')
    if (ppUrl) break
  }

  console.log('pfp target:', target, 'num:', targetNum, 'url:', ppUrl)

  if (!ppUrl) {
    return conn.sendMessage(chat, {
      text: `👤 @${targetNum} no tiene foto de perfil o es privada`,
      mentions: [targetNum + '@s.whatsapp.net']
    }, { quoted: m })
  }

  try {
    await conn.sendMessage(chat, { text: '📸 Guardando foto...' }, { quoted: m })
    await conn.updateProfilePicture(botJid, { url: ppUrl }).catch(e => {
      console.log('pfp updateProfilePicture error:', e.message)
    })
    await conn.sendMessage(chat, { image: { url: ppUrl }, caption: `Foto de @${targetNum}` }, { quoted: m })
  } catch (e) {
    console.log('pfp send error:', e.message)
    await conn.sendMessage(chat, {
      text: `❌ Error al obtener la foto de @${targetNum}`,
      mentions: [targetNum + '@s.whatsapp.net']
    }, { quoted: m })
  }
}
