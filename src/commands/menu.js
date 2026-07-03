export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''

  const groupMetadata = await conn.groupMetadata(jid).catch(() => null)
  if (!groupMetadata) {
    return conn.sendMessage(jid, {
      text: 'Este comando solo funciona en grupos'
    }, { quoted: m })
  }

  const sender = m.key?.participant || m.key?.remoteJid || ''
  const senderName = m.pushName || conn.contacts?.[sender]?.notify || global.db?.contacts?.[sender] || sender.split('@')[0]

  const sections = [
    {
      title: '🎮  interactivos',
      cmds: [
        ['kiss', 'envia un beso a @usuario'],
        ['hug', 'dale un abrazo a @usuario'],
        ['slap', 'envia una bofetada a @usuario'],
        ['pat', 'acaricia a @usuario'],
        ['ship', 'compatibilidad con @usuario']
      ]
    },
    {
      title: '🔥 NSFW',
      cmds: [
        ['fuck', 'accion +18 a @usuario'],
        ['69', 'accion +18'],
        ['anal', '+18 anal'],
        ['boobs', '+18 de tetas'],
        ['blowjob', '+18 blowjob'],
        ['pussy', 'lamele la pucha a @usuario'],
        ['escupir', 'escupe a @usuario']
      ]
    },
    {
      title: '⚙️ ADMINISTRACION',
      cmds: [
        ['kick', 'expulsa a un miembro'],
        ['ban', 'banea a un miembro'],
        ['sacar', 'saca a un miembro'],
        ['ezmevks', 'vacia grupo, menos admins'],
        ['setadmin', 'da rol de admin en el bot'],
        ['deladmin', 'quita rol de admin del bot'],
        ['autoadmin', 'admin automatico al entrar'],
        ['admin', 'muestra admins del bot'],
        ['link', 'link de invitacion del grupo'],
        ['mute', 'silencia a un usuario'],
        ['unmute', 'quita silencio a un usuario'],
        ['lock', 'cierra el chat'],
        ['unlock', 'abre el chat'],
        ['del', 'elimina un mensaje'],
        ['everyone', 'menciona a todos'],
        ['todos', 'menciona a todos'],
        ['antivirgenes', 'filtro anti-contactos'],
        ['autoresponder', 'autorespuestas personalizadas'],
        ['afk', 'estado ausente'],
        ['roles', 'roles del bot']
      ]
    },
    {
      title: '📱 Descargas',
      cmds: [
        ['tt / tiktok', 'descarga videos de tiktok'],
        ['ig / instagram', 'descarga videos de ig'],
        ['sticker', 'crea sticker'],
        ['wm', 'crea sticker con marca de agua'],
        ['brat', 'carta sticker de texto brat']
      ]
    },
    {
      title: '💬 Utilidades',
      cmds: [
        ['ping', 'latencia del bot'],
        ['proofs', 'latencia del bot'],
        ['pfp', 'foto de perfil de un usuario'],
        ['pg', 'limpia mensajes recientes'],
        ['curp', 'genera curp en pdf'],
        ['creador', 'info del creador'],
        ['altera', 'info de altera'],
        ['menu', 'este menu']
      ]
    }
  ]

  let text = `¡Hola! *${senderName}* 👋🏻\n\n`

  for (const section of sections) {
    text += `> ${section.title}\n`
    for (const [cmd, desc] of section.cmds) {
      text += `*${cmd}* — _${desc}_\n`
    }
    text += '\n'
  }

  await conn.sendMessage(jid, { text }, { quoted: m })
}
