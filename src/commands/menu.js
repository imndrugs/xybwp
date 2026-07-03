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
      title: 'INTERACTIVOS',
      cmds: [
        ['kiss', 'Envía un beso a alguien'],
        ['hug', 'Envía un abrazo a alguien'],
        ['fuck', 'Acción +18 a alguien'],
        ['slap', 'Envía una bofetada'],
        ['pat', 'Envía palmaditas'],
        ['ship', 'Compatibilidad con otro usuario'],
        ['69', 'Acción +18'],
        ['anal', 'Acción anal +18'],
        ['boobs', 'Acción +18 de senos'],
        ['blowjob', 'Acción +18 de blowjob'],
        ['pussy', 'Acción +18 de lamer'],
        ['escupir', 'Escupe a alguien']
      ]
    },
    {
      title: 'ADMINISTRACIÓN',
      cmds: [
        ['kick', 'Expulsa a un miembro'],
        ['ban', 'Expulsa a un miembro'],
        ['sacar', 'Expulsa a un miembro'],
        ['ezmevks', 'Elimina a todos los no admins'],
        ['setadmin', 'Da rol de admin en el bot'],
        ['deladmin', 'Quita rol de admin en el bot'],
        ['autoadmin', 'Admin automático al entrar'],
        ['admin', 'Muestra admins del bot'],
        ['link', 'Link de invitación del grupo'],
        ['mute', 'Silencia a un usuario'],
        ['unmute', 'Quita silencio a un usuario'],
        ['lock', 'Cierra el grupo'],
        ['unlock', 'Abre el grupo'],
        ['del', 'Elimina un mensaje'],
        ['everyone', 'Menciona a todos'],
        ['todos', 'Menciona a todos'],
        ['antivirgenes', 'Activa filtro anti-contactos'],
        ['autoresponder', 'Auto-respuestas personalizadas'],
        ['afk', 'Estado ausente'],
        ['roles', 'Roles del bot']
      ]
    },
    {
      title: 'DESCARGAS',
      cmds: [
        ['tiktok', 'Descarga videos de TikTok'],
        ['tt', 'Descarga videos de TikTok'],
        ['instagram', 'Descarga de Instagram'],
        ['ig', 'Descarga de Instagram'],
        ['sticker', 'Crea sticker'],
        ['wm', 'Crea sticker con marca de agua'],
        ['brat', 'Carta sticker de texto brat']
      ]
    },
    {
      title: 'UTILIDADES',
      cmds: [
        ['ping', 'Latencia del bot'],
        ['proofs', 'Latencia del bot'],
        ['pfp', 'Foto de perfil de un usuario'],
        ['pg', 'Limpia mensajes recientes'],
        ['curp', 'Genera CURP en PDF'],
        ['creador', 'Info del creador'],
        ['altera', 'Info de Altera'],
        ['menu', 'Este menú']
      ]
    }
  ]

  let text = 'COMANDOS\n'
  text += '═'.repeat(22) + '\n\n'

  for (const section of sections) {
    text += section.title + '\n'
    for (const [cmd, desc] of section.cmds) {
      text += `  ${cmd.padEnd(12)} ${desc}\n`
    }
    text += '\n'
  }

  text += '═'.repeat(22) + '\n'
  text += `${totalMembers} miembros  ·  ${admins} admins`

  await conn.sendMessage(jid, { text }, { quoted: m })
}
