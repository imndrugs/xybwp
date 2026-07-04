export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''

  const groupMetadata = await conn.groupMetadata(jid).catch(() => null)
  if (!groupMetadata) {
    return conn.sendMessage(jid, {
      text: 'Este comando solo funciona en grupos'
    }, { quoted: m })
  }

  const totalMembers = groupMetadata.participants.length
  const admins = groupMetadata.participants.filter(p => p.admin).length

  const sections = [
    {
      title: '🎮  interactivos',
      cmds: [
        ['kiss', 'Envía un beso a alguien'],
        ['hug', 'Envía un abrazo a alguien'],
        ['slap', 'Dar una bofetada'],
        ['pat', 'Acariciar'],
        ['ship', 'Compatibilidad con otro usuario']
      ]
    },
    {
      title: '🔥 NSFW',
      cmds: [
        ['fuck', 'Follar a alguien'],
        ['69', 'Acción +18'],
        ['anal', 'Acción anal +18'],
        ['boobs', 'Acción +18 de senos'],
        ['blowjob', 'Acción +18 de blowjob'],
        ['pussy', 'Acción +18 de lamer']
      ]
    },
    {
      title: '⚙️ ADMINISTRACION',
      cmds: [
        ['kick', 'Expulsa a un miembro'],
        ['ban', 'Banear usuario del bot'],
        ['unban', 'Desbanear usuario del bot'],
        ['sacar', 'Expulsa a un miembro'],
        ['escupir', 'Escupe a alguien'],
        ['ezmevks', 'Elimina a todos los no admins'],
        ['setadmin', 'Da rol de admin en el bot'],
        ['deladmin', 'Quita rol de admin en el bot'],
        ['makeowner', 'Dar rol de owner'],
        ['autoadmin', 'Admin automático al entrar'],
        ['admin / promote', 'Promueve a un usuario a admin del grupo'],
        ['demote', 'Quita admin de un usuario del grupo'],
        ['link', 'Link de invitación del grupo'],
        ['mute', 'Silenciar a un usuario'],
        ['unmute', 'Quitar silencio a un usuario'],
        ['lock', 'Cierra el grupo'],
        ['unlock', 'Abre el grupo'],
        ['del', 'Elimina un mensaje'],
        ['everyone', 'Menciona a todos'],
        ['todos', 'Menciona a todos'],
        ['antivirgenes', 'Activa filtro anti-binarios'],
        ['autoresponder', 'Auto-respuestas personalizadas'],
        ['afk', 'Estado ausente'],
        ['roles', 'Roles del bot']
      ]
    },
    {
      title: '📱 Descargas',
      cmds: [
        ['tt / tiktok', 'Descarga videos de tiktok'],
        ['ig / instagram', 'Descarga videos de ig'],
        ['play', 'Reproduce música de YouTube'],
        ['music', 'Busca y reproduce música'],
        ['sticker', 'Crea sticker'],
        ['wm', 'Crea sticker con marca de agua'],
        ['brat', 'Sticker con texto personalizado'],
        ['img', 'Sticker a imagen'],
        ['mp4', 'Sticker animado a video'],
        ['ver', 'Ver foto guardada del chat']
      ]
    },
    {
      title: '💬 Utilidades',
      cmds: [
        ['ping', 'Latencia del bot'],
        ['proofs', 'Latencia del bot'],
        ['pfp', 'Foto de perfil de un usuario'],
        ['pg', 'Limpia mensajes recientes'],
        ['curp', 'Genera CURP en PDF'],
        ['creador', 'Info del creador'],
        ['altera', 'Info de altera'],
        ['menu', 'Este menú']
      ]
    },
    {
      title: '🔧 Configuración',
      cmds: [
        ['igcookies', 'Actualizar cookies de Instagram'],
        ['ytcookies', 'Actualizar cookies de YouTube'],
        ['join', 'Unir bot a un grupo por link']
      ]
    }
  ]

  let text = '¡Hola! 👋🏻\n\n'

  for (const section of sections) {
    text += `> ${section.title}\n`
    for (const [cmd, desc] of section.cmds) {
      text += `*${cmd}* — _${desc}_\n\n`
    }
  }

  text += '═══════════════\n'
  text += `*${totalMembers} miembros  ·  ${admins} admins*`

  await conn.sendMessage(jid, { text }, { quoted: m })
}