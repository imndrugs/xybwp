import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''

  try {
    const versionFile = path.resolve(process.cwd(), 'version.json')
    if (fs.existsSync(versionFile)) {
      const data = JSON.parse(fs.readFileSync(versionFile, 'utf8'))
      if (data?.hash) {
        return conn.sendMessage(jid, {
          text: `📦 *VERSIÓN ACTUAL*\n\n🔹 Commit: \`${data.hash.slice(0, 7)}\`\n🔹 Mensaje: ${data.msg || '—'}\n🔹 Fecha: ${data.date || '—'}\n🔹 Hash: \`${data.hash}\``
        }, { quoted: m })
      }
    }

    const envHash = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.COMMIT_SHA || ''
    if (envHash) {
      return conn.sendMessage(jid, {
        text: `📦 *VERSIÓN ACTUAL*\n\n🔹 Commit: \`${envHash.slice(0, 7)}\`\n🔹 Hash: \`${envHash}\``
      }, { quoted: m })
    }

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

    await conn.sendMessage(jid, { text: '⚠️ No se pudo obtener la versión' }, { quoted: m })
  } catch {
    await conn.sendMessage(jid, { text: '⚠️ No se pudo obtener la versión' }, { quoted: m })
  }
}
