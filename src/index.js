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
    const cmd = args[0].toLowerCase()

    try {
      const mod = await import(`./commands/${cmd.replace('!', '')}.js`)
        .catch(() => null)

      if (mod?.default) {
        await mod.default(conn, m, args.slice(1), global.db, chat)
      }

    } catch (e) {
      console.log("Error comando:", e)
    }
  })
}

startBot()