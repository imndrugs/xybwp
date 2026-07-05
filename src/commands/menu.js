import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const categories = {
  '🎮 Interactivos': ['hi', 'hola', 'bye', 'adios', 'kiss', 'hug', 'slap', 'pat', 'ship'],
  '🔥 NSFW': ['fuck', '69', 'anal', 'boobs', 'blowjob', 'pussy'],
  '⚙️ STAFF': [
    'admin', 'promote', 'demote', 'kick', 'sacar', 'escupir',
    'ban', 'unban', 'setadmin', 'deladmin', 'makeowner', 'autoadmin',
    'mute', 'unmute', 'lock', 'unlock', 'del', 'enrique',
    'link', 'cmdoff', 'cmdon', 'testowner',
    'antivirgenes', 'autoresponder', 'afk', 'roles'
  ],
  '📱 Descargas': [
    'tt', 'tiktok', 'ig', 'instagram', 'play', 'music',
    'sticker', 'wm', 'brat', 'img', 'mp4'
  ],
  '💬 Utilidades': [
    'ping', 'proofs', 'pfp', 'pg', 'snipe', 'id', 'version',
    'curp', 'creador', 'altera', 'n', 'notify',
    'everyone', 'todos', 'igcookies', 'ytcookies', 'join',
    'kira', 'pause', 'ver', 'menu'
  ]
}

const descriptions = {
  hi: 'GIF anime saludando', hola: 'GIF anime saludando',
  bye: 'GIF anime despidiendo', adios: 'GIF anime despidiendo',
  kiss: 'Besar a alguien', hug: 'Abrazar a alguien',
  slap: 'Dar una bofetada', pat: 'Acariciar',
  ship: 'Compatibilidad amorosa',
  fuck: 'Follar a alguien', '69': 'Acción +18',
  anal: 'Acción anal +18', boobs: 'Acción +18 senos',
  blowjob: 'Acción +18 blowjob', pussy: 'Acción +18 lamer',
  admin: 'Promover admin del grupo', promote: 'Promover admin del grupo',
  demote: 'Quitar admin del grupo', kick: 'Expulsar miembro',
  sacar: 'Expulsar miembro', escupir: 'Expulsar miembro',
  ban: 'Banear usuario del bot', unban: 'Desbanear usuario',
  setadmin: 'Dar rol admin en el bot', deladmin: 'Quitar rol admin',
  makeowner: 'Dar rol owner', autoadmin: 'Admin automático al entrar',
  mute: 'Silenciar usuario', unmute: 'Quitar silencio',
  lock: 'Cerrar grupo', unlock: 'Abrir grupo',
  del: 'Eliminar mensaje', enrique: 'Kick a todos los no admins',
  link: 'Link de invitación', cmdoff: 'Desactivar comando',
  cmdon: 'Activar comando', testowner: 'Testear si eres owner',
  antivirgenes: 'Filtro anti-contactos', autoresponder: 'Auto-respuestas',
  afk: 'Estado ausente', roles: 'Roles del bot',
  tt: 'Descargar TikTok', tiktok: 'Descargar TikTok',
  ig: 'Descargar Instagram', instagram: 'Descargar Instagram',
  play: 'Reproducir música YouTube', music: 'Buscar y reproducir música',
  sticker: 'Crear sticker', wm: 'Sticker con marca de agua',
  brat: 'Sticker texto personalizado', img: 'Sticker a imagen',
  mp4: 'Sticker animado a video',
  ping: 'Latencia del bot', proofs: 'Latencia del bot',
  pfp: 'Foto de perfil', pg: 'Limpiar mensajes',
  snipe: 'Ver mensajes eliminados', id: 'Ver JID de usuario',
  version: 'Versión del bot', curp: 'Generar CURP PDF',
  creador: 'Info del creador', altera: 'Info de altera',
  n: 'Notificar a todos sin @', notify: 'Notificar a todos sin @',
  everyone: 'Mencionar a todos', todos: 'Mencionar a todos',
  igcookies: 'Actualizar cookies IG', ytcookies: 'Actualizar cookies YT',
  join: 'Unir bot al grupo', kira: 'Spam kira',
  pause: 'Detener spam', ver: 'Ver foto del chat',
  menu: 'Este menú'
}

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

  const dir = path.dirname(fileURLToPath(import.meta.url))
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).map(f => f.replace(/\.js$/, ''))
  const totalCmds = files.length

  let text = '> COMANDOS DISPONIBLES\n\n'
  text += `⚡ ${totalCmds} comandos\n\n`

  for (const [section, cmds] of Object.entries(categories)) {
    const filtered = cmds.filter(c => files.includes(c))
    if (!filtered.length) continue
    text += `📌 ${section}\n`
    text += filtered.map(c => {
      const desc = descriptions[c] || ''
      return desc ? `✦ ${c} — ${desc}` : `✦ ${c}`
    }).join('\n')
    text += '\n\n'
  }

  text += '═══════════════\n'
  text += '📌 Prefijos:  .  !  xyb\n'
  text += `👥 ${totalMembers} miembros  ·  ${admins} admins`

  await conn.sendMessage(jid, { text }, { quoted: m })
}
