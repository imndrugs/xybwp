import { execSync } from 'child_process'

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''

  try {
    const hash = execSync('git log -1 --format="%H"', { encoding: 'utf8', timeout: 5000 }).trim()
    const msg = execSync('git log -1 --format="%s"', { encoding: 'utf8', timeout: 5000 }).trim()
    const date = execSync('git log -1 --format="%ai"', { encoding: 'utf8', timeout: 5000 }).trim()
    const short = hash.slice(0, 7)

    await conn.sendMessage(jid, {
      text: `📦 *VERSIÓN ACTUAL*\n\n🔹 Commit: \`${short}\`\n🔹 Mensaje: ${msg}\n🔹 Fecha: ${date}\n🔹 Hash: \`${hash}\``
    }, { quoted: m })
  } catch {
    await conn.sendMessage(jid, {
      text: '⚠️ No se pudo obtener la versión (git no disponible)'
    }, { quoted: m })
  }
}
