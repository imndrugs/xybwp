import fs from 'fs'
import path from 'path'

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''

  try {
    const gitDir = path.join(process.cwd(), '.git')
    const head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim()
    let hash = ''
    if (head.startsWith('ref: ')) {
      const refPath = path.join(gitDir, head.slice(5))
      hash = fs.readFileSync(refPath, 'utf8').trim()
    } else {
      hash = head
    }
    if (!hash) throw new Error('no hash')

    const short = hash.slice(0, 7)

    await conn.sendMessage(jid, {
      text: `📦 *VERSIÓN ACTUAL*\n\n🔹 Commit: \`${short}\`\n🔹 Hash: \`${hash}\``
    }, { quoted: m })
  } catch {
    await conn.sendMessage(jid, {
      text: '⚠️ No se pudo obtener la versión'
    }, { quoted: m })
  }
}
