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
    admins: []
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

  const contactsFile = path.join(process.cwd(), 'contacts.json')
  global.db.contacts = {}
  if (!conn.contacts) conn.contacts = {}

  try {
    const data = fs.readFileSync(contactsFile, 'utf8')
    global.db.contacts = JSON.parse(data)
    for (const [key, name] of Object.entries(global.db.contacts)) {
      conn.contacts[key] = { id: key, notify: name, name: name }
    }
  } catch {}

  function saveContacts() {
    try { fs.writeFileSync(contactsFile, JSON.stringify(global.db.contacts, null, 2)) } catch {}
  }

  conn.ev.on('contacts.upsert', (contacts) => {
    let changed = false
    for (const c of contacts) {
      if (!c.id) continue
      const key = c.id.split('@')[0].split(':')[0] + '@s.whatsapp.net'
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
      const key = raw.split('@')[0].split(':')[0] + '@s.whatsapp.net'
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

  conn.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0]

    if (!m?.message) return
    if (!m?.key?.remoteJid) return

    const chat = getChat(m)
    if (!chat) return   // 🔥 EVITA EL ERROR

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