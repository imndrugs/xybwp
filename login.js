import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } from '@whiskeysockets/baileys'
import P from 'pino'

console.log('🚀 Iniciando login local...')

try {
  const { state, saveCreds } = await useMultiFileAuthState('./sessions')
  const { version } = await fetchLatestBaileysVersion()

  const conn = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    logger: P({ level: 'warn' }),
    browser: ['Chrome', 'Edge', '120.0.0']
  })

  conn.ev.on('creds.update', saveCreds)

  conn.ev.on('connection.update', (update) => {
    const { connection, qr, lastDisconnect } = update

    if (qr) {
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`
      console.log('\n📱 ESCANEA EL QR (terminal) O USA EL LINK:\n')
      console.log(url)
      console.log('')
    }

    if (connection === 'open') {
      console.log('\n✅ Conectado! Sesión guardada en sessions/')
      console.log('📁 Ahora haz: git add sessions/ && git commit -m "sessions" && git push origin main\n')
      process.exit(0)
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      if (code === DisconnectReason.loggedOut) {
        console.log('❌ Sesión cerrada/loggedOut. Borrando sessions/ para reintentar...')
        try {
          const fs = await import('fs')
          const path = await import('path')
          const dir = './sessions'
          if (fs.existsSync(dir)) {
            for (const f of fs.readdirSync(dir)) {
              fs.rmSync(dir + '/' + f, { recursive: true, force: true })
            }
          }
        } catch {}
        console.log('🔄 Reintentando en 2s...')
        setTimeout(() => process.exit(1), 2000)
      } else {
        console.log('❌ Error de conexión, reintentando en 3s...')
        setTimeout(() => process.exit(1), 3000)
      }
    }
  })
} catch (e) {
  console.error('💥 Error:', e)
  process.exit(1)
}
