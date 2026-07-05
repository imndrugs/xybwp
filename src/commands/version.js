import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''

  try {
    const hash = execSync('git log -1 --format="%H"', { encoding: 'utf8', timeout: 5000 }).trim()
    const msg = execSync('git log -1 --format="%s"', { encoding: 'utf8', timeout: 5000 }).trim()
    const date = execSync('git log -1 --format="%ai"', { encoding: 'utf8', timeout: 5000 }).trim()

    await conn.sendMessage(jid, {
      text: `📦 *VERSIÓN ACTUAL*\n\n🔹 Commit: \`${hash.slice(0, 7)}\`\n🔹 Mensaje: ${msg}\n🔹 Fecha: ${date}\n🔹 Hash: \`${hash}\``
    }, { quoted: m })
  } catch {
    // Fallback: Railway env vars
    const envHash = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.COMMIT_SHA || ''
    if (envHash) {
      return conn.sendMessage(jid, {
        text: `📦 *VERSIÓN ACTUAL*\n\n🔹 Commit: \`${envHash.slice(0, 7)}\`\n🔹 Hash: \`${envHash}\``
      }, { quoted: m })
    }

    // Fallback: read .git directly
    try {
      const headFile = path.resolve(process.cwd(), '.git', 'HEAD')
      if (fs.existsSync(headFile)) {
        const head = fs.readFileSync(headFile, 'utf8').trim()
        let h = ''
        if (head.startsWith('ref: ')) {
          const refPath = path.resolve(process.cwd(), '.git', head.slice(5))
          if (fs.existsSync(refPath)) h = fs.readFileSync(refPath, 'utf8').trim()
        } else {
          h = head
        }
        if (h) {
          return conn.sendMessage(jid, {
            text: `📦 *VERSIÓN ACTUAL*\n\n🔹 Commit: \`${h.slice(0, 7)}\`\n🔹 Hash: \`${h}\``
          }, { quoted: m })
        }
      }
    } catch {}

    await conn.sendMessage(jid, { text: '⚠️ No se pudo obtener la versión' }, { quoted: m })
  }
}
