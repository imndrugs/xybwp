import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import P from 'pino'
import fs from 'fs'
import path from 'path'

console.log('🚀 Login local - siempre muestra QR nuevo')

// Borrar sessions viejas siempre
const dir = './sessions'
if (fs.existsSync(dir)) {
  for (const f of fs.readdirSync(dir)) {
    fs.rmSync(path.join(dir, f), { recursive: true, force: true })
  }
  console.log('🗑️ Sessions viejas eliminadas')
}

try {
  const { state, saveCreds } = await useMultiFileAuthState('./sessions')
  const { version } = await fetchLatestBaileysVersion()

  const conn = makeWASocket({
    version,
    auth: state,
    logger: P({ level: 'warn' }),
    browser: ['Chrome', 'Edge', '120.0.0']
  })

  conn.ev.on('creds.update', saveCreds)

  conn.ev.on('connection.update', (update) => {
    const { connection, qr } = update

    if (qr) {
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`
      console.log('\n╔══════════════════════════════════════════╗')
      console.log('║   📱 ESCANEA ESTE QR CON TU CELULAR     ║')
      console.log('╚══════════════════════════════════════════╝')
      console.log('')
      console.log('🔗 Abre el link o escanea el QR de arriba:')
      console.log(url)
      console.log('')
      console.log('⚠️ USA UN NÚMERO DIFERENTE al restringido')
      console.log('')
    }

    if (connection === 'open') {
      console.log('\n✅ Conectado! Nueva sesión guardada en sessions/')
      console.log('📁 Ahora haz:')
      console.log('   git add sessions/')
      console.log('   git commit -m "new sessions"')
      console.log('   git push origin main\n')
      process.exit(0)
    }

    if (connection === 'close') {
      console.log('❌ Error de conexión, reintentando en 3s...')
      setTimeout(() => process.exit(1), 3000)
    }
  })
} catch (e) {
  console.error('💥 Error:', e)
  process.exit(1)
}
