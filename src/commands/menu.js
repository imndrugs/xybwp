import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

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
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'))
  const commandNames = files.map(f => f.replace(/\.js$/, '')).sort()
  const totalCmds = commandNames.length

  let text = '> COMANDOS DISPONIBLES\n\n'
  text += `⚡ ${totalCmds} comandos\n\n`

  text += commandNames.map(cmd => `✦ ${cmd}`).join('\n')

  text += '\n\n═══════════════\n'
  text += '📌 Prefijos:  .  !  xyb\n'
  text += `👥 ${totalMembers} miembros  ·  ${admins} admins`

  await conn.sendMessage(jid, { text }, { quoted: m })
}
