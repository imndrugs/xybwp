import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import P from 'pino'
import { execSync } from 'child_process'

async function login() {
  const { state, saveCreds } = await useMultiFileAuthState('./sessions')
  const { version } = await fetchLatestBaileysVersion()

  const conn = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    logger: P({ level: 'silent' }),
    browser: ['Chrome', 'Edge', '120.0.0']
  })

  conn.ev.on('creds.update', saveCreds)

  conn.ev.on('connection.update', (update) => {
    const { connection, qr } = update

    if (qr) {
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`
      console.log('\n📱 ESCANEA EL QR DE ARRIBA O ABRE:\n' + url + '\n')
      try {
        execSync(`start msedge "${url}"`, { timeout: 3000, stdio: 'ignore' })
      } catch {}
      try {
        execSync(`start chrome "${url}"`, { timeout: 3000, stdio: 'ignore' })
      } catch {}
    }

    if (connection === 'open') {
      console.log('✅ Conectado. Sesión guardada en sessions/')
      console.log('📁 Sube la carpeta sessions/ a Railway')
      process.exit(0)
    }
  })
}

login()
