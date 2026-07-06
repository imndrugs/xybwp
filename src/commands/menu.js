import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const categories = {
  '🎮 Interactivos': ['hi', 'hola', 'bye', 'adios', 'love', 'dado', 'ppt', 'encuesta', 'frase'],
  '🔥 NSFW': ['fuck', '69', 'anal', 'boobs', 'blowjob', 'pussy'],
  '🔐 STAFF': [
    'ban', 'unban', 'del', 'enrique',
    'setadmin', 'deladmin', 'makeowner',
    'cmdoff', 'cmdon', 'testowner',
    'bc', 'setname', 'setwm', 'mode'
  ],
  '⚙️ ADMINISTRACIÓN': [
    'admin', 'promote', 'demote',
    'kick', 'sacar', 'escupir',
    'mute', 'unmute',
    'welcome', 'goodbye', 'antilink', 'antispam',
    'group', 'invite', 'linkrevoke', 'setdesc',
    'link', 'autoadmin', 'antivirgenes'
  ],
  '📱 Descargas': [
    'tt', 'tiktok', 'ig', 'instagram',
    'play', 'music', 'ytmp3',
    'twitter', 'facebook', 'spotify',
    'mediafire', 'letra',
    'sticker', 'wm', 'brat', 'img', 'mp4'
  ],
  '💬 Utilidades': [
    'ping', 'proofs', 'pfp', 'pg', 'snipe', 'id', 'version',
    'n', 'notify', 'everyone', 'todos',
    'translate', 'short', 'wiki', 'anime',
    'readqr', 'globo',
    'join', 'ver', 'menu',
    'autoresponder', 'afk', 'roles',
    'igcookies', 'ytcookies'
  ]
}

const descriptions = {
  hi: 'GIF anime saludando', hola: 'GIF anime saludando',
  bye: 'GIF anime despidiendo', adios: 'GIF anime despidiendo',
  love: 'Medir compatibilidad amorosa',
  dado: 'Lanzar un dado 🎲',
  ppt: 'Piedra, papel o tijera',
  encuesta: 'Crear encuesta con opciones',
  frase: 'Frase célebre aleatoria',
  fuck: 'Follar a alguien', '69': 'Acción +18',
  anal: 'Acción anal +18', boobs: 'Acción +18 senos',
  blowjob: 'Acción +18 blowjob', pussy: 'Acción +18 lamer',
  promote: 'Promover admin del grupo', demote: 'Quitar admin',
  kick: 'Expulsar miembro', sacar: 'Expulsar', escupir: 'Expulsar',
  ban: 'Banear usuario del bot', unban: 'Desbanear usuario',
  del: 'Eliminar mensaje', enrique: 'Kick a todos los no admins',
  setadmin: 'Dar rol admin en el bot', deladmin: 'Quitar rol admin',
  makeowner: 'Dar rol owner',
  cmdoff: 'Desactivar comando', cmdon: 'Activar comando',
  testowner: 'Testear si eres owner',
  bc: 'Broadcast a todos los grupos',
  setname: 'Cambiar nombre del bot',
  setwm: 'Configurar watermark stickers',
  mode: 'Cambiar modo public/private',
  mute: 'Silenciar usuario', unmute: 'Quitar silencio',
  welcome: 'Configurar mensaje de bienvenida',
  goodbye: 'Configurar mensaje de despedida',
  antilink: 'Activar/desactivar anti-enlaces',
  antispam: 'Activar/desactivar anti-spam',
  group: 'Abrir/cerrar el grupo',
  invite: 'Link de invitación del grupo',
  linkrevoke: 'Revocar link de invitación',
  setdesc: 'Cambiar descripción del grupo',
  link: 'Link de invitación',
  autoadmin: 'Admin automático al entrar',
  antivirgenes: 'Filtro anti-contactos',
  tt: 'Descargar TikTok', tiktok: 'Descargar TikTok',
  ig: 'Descargar Instagram', instagram: 'Descargar Instagram',
  play: 'Reproducir música YouTube', music: 'Buscar y reproducir música',
  ytmp3: 'Descargar audio de YouTube',
  twitter: 'Descargar video de Twitter/X',
  facebook: 'Descargar video de Facebook',
  spotify: 'Descargar canción de Spotify',
  mediafire: 'Obtener enlace directo de MediaFire',
  letra: 'Buscar letra de canción',
  sticker: 'Crear sticker', wm: 'Sticker con marca de agua',
  brat: 'Sticker texto personalizado', img: 'Sticker a imagen',
  mp4: 'Sticker animado a video',
  ping: 'Latencia del bot', proofs: 'Latencia del bot',
  pfp: 'Foto de perfil', pg: 'Limpiar mensajes',
  snipe: 'Ver mensajes eliminados', id: 'Ver JID de usuario',
  version: 'Versión del bot',
  n: 'Notificar a todos sin @', notify: 'Notificar a todos sin @',
  everyone: 'Mencionar a todos', todos: 'Mencionar a todos',
  translate: 'Traducir texto a español',
  short: 'Acortar URL',
  wiki: 'Buscar en Wikipedia',
  anime: 'Buscar información de anime',
  readqr: 'Leer código QR de una imagen',
  globo: 'Superponer imagen en globo de diálogo y enviar sticker',
  join: 'Unir bot al grupo',
  ver: 'Ver foto del chat',
  menu: 'Este menú',
  autoresponder: 'Auto-respuestas personalizadas',
  afk: 'Estado ausente', roles: 'Roles del bot',
  igcookies: 'Actualizar cookies IG', ytcookies: 'Actualizar cookies YT'
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
