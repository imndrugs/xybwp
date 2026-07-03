function getJid(m) {
    return m?.key?.remoteJid || m?.chat || m?.sender || ""
}

import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} from '@whiskeysockets/baileys'

import P from 'pino'
import qrcode from 'qrcode-terminal'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config()

async function startBot() {

  const { state, saveCreds } = await useMultiFileAuthState('./sessions')
  const { version } = await fetchLatestBaileysVersion()

  const conn = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: 'silent' })
  })

  global.db = {
  data: {
    admins: [],
    muted: [],
    autoresponder: {},
    afk: {}
  }
}

  conn.ev.on('creds.update', saveCreds)

  conn.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      console.log("📱 Escanea el QR:")
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'open') {
      console.log("✅ Bot conectado correctamente")
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode

      console.log("❌ Conexión cerrada")

      if (code !== DisconnectReason.loggedOut) {
        startBot()
      }
    }
  })

  const dataFile = path.join(process.cwd(), 'database.json')

  function loadDB() {
    try {
      const raw = fs.readFileSync(dataFile, 'utf8')
      const parsed = JSON.parse(raw)
      if (parsed) {
        if (parsed.contacts) global.db.contacts = parsed.contacts
        if (parsed.data) {
          if (parsed.data.admins) global.db.data.admins = parsed.data.admins
          if (parsed.data.muted) global.db.data.muted = parsed.data.muted
          if (parsed.data.autoresponder) global.db.data.autoresponder = parsed.data.autoresponder
          if (parsed.data.afk) global.db.data.afk = parsed.data.afk
        }
      }
    } catch {}
  }

  function saveDB() {
    try {
      const toSave = {
        contacts: global.db.contacts || {},
        data: {
          admins: global.db.data?.admins || [],
          muted: global.db.data?.muted || [],
          autoresponder: global.db.data?.autoresponder || {},
          afk: global.db.data?.afk || {}
        }
      }
      fs.writeFileSync(dataFile, JSON.stringify(toSave, null, 2))
    } catch {}
  }

  if (!global.db.contacts) global.db.contacts = {}
  if (!conn.contacts) conn.contacts = {}
  if (!global.db.data) global.db.data = {}
  if (!global.db.data.muted) global.db.data.muted = []
  if (!global.db.data.autoresponder) global.db.data.autoresponder = {}
  if (!global.db.data.afk) global.db.data.afk = {}

  loadDB()

  const normalizedId = (jid) => {
    if (!jid) return ''
    return jid.split('@')[0].split(':')[0] + '@s.whatsapp.net'
  }

  function saveContacts() {
    saveDB()
  }

  conn.ev.on('contacts.upsert', (contacts) => {
    let changed = false
    for (const c of contacts) {
      if (!c.id) continue
      const key = normalizedId(c.id)
      const name = c.notify || c.name || c.pushName
      if (name && global.db.contacts[key] !== name) {
        global.db.contacts[key] = name
        conn.contacts[key] = { id: key, notify: name, name: name }
        changed = true
      }
    }
    if (changed) saveContacts()
  })

  conn.ev.on('messages.upsert', ({ messages }) => {
    let changed = false
    for (const msg of messages) {
      const raw = msg.key?.participant || msg.key?.remoteJid
      if (!raw || !msg.pushName) continue
      const key = normalizedId(raw)
      if (global.db.contacts[key] !== msg.pushName) {
        global.db.contacts[key] = msg.pushName
        conn.contacts[key] = { id: key, notify: msg.pushName, name: msg.pushName }
        changed = true
      }
    }
    if (changed) saveContacts()
  })

  // 🔥 FIX CHAT SEGURO
  const getChat = (m) =>
    m?.key?.remoteJid || m?.chat || m?.sender || null

  const getName = (jid) => {
    const key = normalizedId(jid)
    return conn.contacts?.[key]?.notify || global.db.contacts?.[key] || key.split('@')[0]
  }

  conn.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0]

    if (!m?.message) return
    if (!m?.key?.remoteJid) return

    const chat = getChat(m)
    if (!chat) return

    const isGroup = chat.endsWith('@g.us')
    const sender = normalizedId(m.key?.participant || m.key?.remoteJid)
    const botJid = normalizedId(conn.user?.id || conn.user?.jid || '')

    // --- MUTE SYSTEM ---
    if (isGroup && global.db.data?.muted?.includes(sender) && sender !== botJid) {
      try {
        await conn.sendMessage(chat, { delete: { remoteJid: m.key.remoteJid, fromMe: false, id: m.key.id, participant: m.key.participant } })
      } catch (e) {
        console.log("Mute delete error:", e)
      }
      return
    }

    // --- AFK CHECK ---
    if (isGroup && m.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
      for (const mentioned of m.message.extendedTextMessage.contextInfo.mentionedJid) {
        const afkKey = normalizedId(mentioned)
        const afkData = global.db.data?.afk?.[afkKey]
        if (afkData) {
          const elapsed = Math.floor((Date.now() - afkData.since) / 1000)
          const mins = Math.floor(elapsed / 60)
          const secs = elapsed % 60
          const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
          await conn.sendMessage(chat, {
            text: `⏰ *${afkData.name}* está AFK desde hace ${timeStr}\n\n📝 Motivo: ${afkData.reason || 'Sin motivo'}`
          }, { quoted: m })
          break
        }
      }
    }

    // --- AUTORESPONDER ---
    if (isGroup) {
      const textContent =
        m.message.conversation ||
        m.message.extendedTextMessage?.text ||
        ''
      const autoresponder = global.db.data?.autoresponder || {}
      for (const [trigger, response] of Object.entries(autoresponder)) {
        if (textContent.toLowerCase().includes(trigger.toLowerCase())) {
          await conn.sendMessage(chat, { text: response }, { quoted: m })
          break
        }
      }
    }

    // --- TAG BOT RESPONSE ---
    if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.some(j => normalizedId(j) === botJid)) {
      if (sender !== botJid) {
        const textContent =
          m.message.conversation ||
          m.message.extendedTextMessage?.text ||
          ''
        const cleanCmd = textContent.replace(/^[.!]+\s*/, '').trim()
        // Only respond if it's not a command (starts with ! or .)
        if (!/^[.!]/.test(textContent.trim())) {
          await conn.sendMessage(chat, { text: 'no estes chingando puta' }, { quoted: m })
        }
      }
    }

    const text =
      m.message.conversation ||
      m.message.extendedTextMessage?.text ||
      ''

    if (!text) return

    const args = text.trim().split(/ +/)
    let cmd = args[0].toLowerCase()
    let cmdArgs = args.slice(1)

    if (cmd === 'xyb' && args.length > 1) {
      cmd = args[1].toLowerCase()
      cmdArgs = args.slice(2)
    }

    const commandName = cmd.replace(/^[.!]/, '')

    // Handle .s alias for sticker
    if (commandName === 's' || commandName === 'sticker') {
      try {
        const mod = await import(`./commands/sticker.js`).catch(() => null)
        if (mod?.default) {
          await mod.default(conn, m, cmdArgs, global.db, chat)
        }
      } catch (e) {
        console.log("Error comando:", e)
      }
      return
    }

    try {
      const mod = await import(`./commands/${commandName}.js`)
        .catch(() => null)

      if (mod?.default) {
        await mod.default(conn, m, cmdArgs, global.db, chat)
      }

    } catch (e) {
      console.log("Error comando:", e)
    }
  })
}

startBot()
