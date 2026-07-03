import { getSenderId } from '../lib/perms.js'
import fs from 'fs'
import path from 'path'

export default async function handler(conn, m, args, db) {
  const jid = m.chat || m.key?.remoteJid || ''
  const sender = getSenderId(m)

  if (!args[0]) {
    return conn.sendMessage(jid, {
      text: '📝 *AUTORESPONDER*\n\n.autoresponder add "trigger" "response"\n.autoresponder remove "trigger"\n.autoresponder list'
    }, { quoted: m })
  }

  const sub = args[0].toLowerCase()

  if (sub === 'add') {
    const full = args.slice(1).join(' ')
    const match = full.match(/"([^"]+)"\s*"([^"]+)"/)
    if (!match) {
      return conn.sendMessage(jid, {
        text: '❌ Uso: .autoresponder add "trigger" "response"'
      }, { quoted: m })
    }
    const trigger = match[1].toLowerCase()
    const response = match[2]
    if (!db.data.autoresponder) db.data.autoresponder = {}
    db.data.autoresponder[trigger] = response
    const dataFile = path.join(process.cwd(), 'database.json')
    try {
      const raw = JSON.parse(fs.readFileSync(dataFile, 'utf8') || '{}')
      if (!raw.data) raw.data = {}
      if (!raw.data.autoresponder) raw.data.autoresponder = {}
      raw.data.autoresponder[trigger] = response
      fs.writeFileSync(dataFile, JSON.stringify(raw, null, 2))
    } catch {}
    return conn.sendMessage(jid, {
      text: `✅ Auto-respuesta agregada:\n\n"${trigger}" → "${response}"`
    }, { quoted: m })
  }

  if (sub === 'remove') {
    const full = args.slice(1).join(' ')
    const match = full.match(/"([^"]+)"/)
    if (!match) {
      return conn.sendMessage(jid, {
        text: '❌ Uso: .autoresponder remove "trigger"'
      }, { quoted: m })
    }
    const trigger = match[1].toLowerCase()
    if (!db.data.autoresponder?.[trigger]) {
      return conn.sendMessage(jid, {
        text: `❌ No existe la auto-respuesta para "${trigger}"`
      }, { quoted: m })
    }
    delete db.data.autoresponder[trigger]
    const dataFile = path.join(process.cwd(), 'database.json')
    try {
      const raw = JSON.parse(fs.readFileSync(dataFile, 'utf8') || '{}')
      if (raw.data?.autoresponder?.[trigger]) {
        delete raw.data.autoresponder[trigger]
        fs.writeFileSync(dataFile, JSON.stringify(raw, null, 2))
      }
    } catch {}
    return conn.sendMessage(jid, {
      text: `🗑️ Auto-respuesta eliminada: "${trigger}"`
    }, { quoted: m })
  }

  if (sub === 'list') {
    const autoresponder = db.data?.autoresponder || {}
    const keys = Object.keys(autoresponder)
    if (!keys.length) {
      return conn.sendMessage(jid, {
        text: '📝 No hay auto-respuestas configuradas.'
      }, { quoted: m })
    }
    const list = keys.map(k => `"${k}" → "${autoresponder[k]}"`).join('\n')
    return conn.sendMessage(jid, {
      text: `📝 *AUTO-RESPUESTAS*\n\n${list}`
    }, { quoted: m })
  }

  return conn.sendMessage(jid, {
    text: '❌ Subcomando inválido. Usa: add, remove, list'
  }, { quoted: m })
}
