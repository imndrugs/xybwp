import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''

  const groupMetadata = await conn.groupMetadata(jid).catch(() => null)

  if (!groupMetadata) {
    return conn.sendMessage(jid, {
      text: '⚠️ Este comando solo funciona en grupos'
    }, { quoted: m })
  }

  try {
    // Obtener lista de comandos
    const commandsDir = __dirname
    const files = fs.readdirSync(commandsDir)
      .filter(file => file.endsWith('.js') && file !== 'menu.js')
      .map(file => file.replace('.js', ''))
      .sort()

    const totalCommands = files.length
    const commandsList = files.map(cmd => `  • ${cmd}`).join('\n')

    // Información del grupo
    const totalMembers = groupMetadata.participants.length
    const admins = groupMetadata.participants
      .filter(p => p.admin)
      .map(p => {
        const num = p.id.replace('@s.whatsapp.net', '')
        return `  • @${num}`
      })
      .join('\n')

    // Información del creador
    const creatorInfo = 'EzMe\n  • +52 564 444 4644'

    // Construir mensaje
    let text = `📋 COMANDOS (${totalCommands})\n${commandsList}\n\n`
    text += `👥 Grupo • ${totalMembers} miembros`
    if (admins) {
      text += `\n🛡️ Admins (${admins.split('\n').length})\n${admins}`
    }
    text += `\n\n👑 ${creatorInfo}`

    await conn.sendMessage(jid, { text }, { quoted: m })
  } catch (error) {
    console.error('Error en menu:', error)
    await conn.sendMessage(jid, {
      text: '❌ Error al generar el menú'
    }, { quoted: m })
  }
}
