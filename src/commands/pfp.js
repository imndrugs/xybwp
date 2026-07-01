import { getSenderId, clean } from '../lib/perms.js'

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''
  const sender = getSenderId(m)

  let who = null

  // Verificar si es un reply
  const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
  if (quotedMsg) {
    who = m.message?.extendedTextMessage?.contextInfo?.participant || sender
  }

  // Verificar si hay menciones
  const mentionedJid = m.message?.extendedTextMessage?.contextInfo?.mentionedJid
  if (!who && mentionedJid?.[0]) {
    who = mentionedJid[0]
  }

  // Verificar si hay número en args (junta todos los argumentos)
  if (!who && args.length > 0) {
    let numero = args.join('').replace(/[^0-9]/g, '')
    if (numero.length < 10) {
      return conn.sendMessage(jid, { text: '⚠️ Número inválido. Usa el código de país.\nEj: .pfp 525644444644' }, { quoted: m })
    }
    who = numero
  }

  // Si no hay nada, usar al sender
  if (!who) {
    who = sender
  }

  // Convertir a formato numérico limpio
  who = clean(who)

  try {
    console.log('🔍 Buscando foto de:', who)
    
    let ppUrl = null
    const whoFull = who.includes('@') ? who : who + '@s.whatsapp.net'
    
    // Intentar obtener foto de perfil
    ppUrl = await conn.profilePictureUrl(whoFull, 'image')

    await conn.sendMessage(
      jid,
      {
        image: { url: ppUrl },
        caption: `Foto de @${who}`,
        mentions: [whoFull]
      },
      { quoted: m }
    )
  } catch (error) {
    console.error('❌ Error en pfp:', error?.message)
    const numeroLimpio = who
    
    await conn.sendMessage(jid, { text: `👤 @${numeroLimpio} no tiene foto de perfil o la tiene privada`, mentions: [numeroLimpio.includes('@') ? numeroLimpio : numeroLimpio + '@s.whatsapp.net'] }, { quoted: m })
  }
}
