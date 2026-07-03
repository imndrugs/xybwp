function getJid(m) {
    return m?.key?.remoteJid || m?.chat || m?.sender || ""
}

import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  downloadMediaMessage
} from '@whiskeysockets/baileys'

import P from 'pino'
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
    afk: {},
    antivirgenes: []
  }
}

  global._msgLog = {}

  conn.ev.on('creds.update', saveCreds)

  conn.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`
      console.log("📱 Escanea este QR (abre el link):", qrUrl)
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
          if (parsed.data.antivirgenes) global.db.data.antivirgenes = parsed.data.antivirgenes
          if (parsed.data.autoresponder) {
            const ar = parsed.data.autoresponder
            if (typeof ar[Object.keys(ar)[0]] === 'string') {
              global.db.data.autoresponder = { global: { ...ar } }
            } else {
              global.db.data.autoresponder = ar
            }
          }
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
          antivirgenes: global.db.data?.antivirgenes || [],
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
  if (!global.db.data.antivirgenes) global.db.data.antivirgenes = []
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

  // --- NOTIFICAR CAMBIOS DE ADMIN (via event) ---
  conn.ev.on('group-participants.update', async ({ id, participants, action, author }) => {
    if (!id?.endsWith?.('@g.us')) return
    if (action !== 'promote' && action !== 'demote') return
    const actorJid = (typeof author === 'string' ? author : author?.jid || '')
    const affected = participants.map(p => (typeof p === 'string' ? p : p?.jid || '')).filter(Boolean)
    const allJids = [actorJid, ...affected].filter(Boolean)
    const actorMention = actorJid ? ` @${actorJid.split('@')[0]}` : ''
    const affectedMentions = affected.map(j => `@${j.split('@')[0]}`).join(', ')
    const text = action === 'promote'
      ? `⭐${actorMention} promovió a ${affectedMentions} como admin`
      : `⬇️${actorMention} quitó admin a ${affectedMentions}`
    if (text.length > 5) {
      await conn.sendMessage(id, { text, mentions: allJids }).catch(() => {})
    }
  })

  const processedIds = new Set()

  conn.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    const m = messages[0]
    if (!m?.key?.remoteJid || m.key.fromMe) return

    const msgId = m.key.id
    if (processedIds.has(msgId)) return
    processedIds.add(msgId)
    if (processedIds.size > 1000) processedIds.clear()

    // --- SAVE PHOTOS FOR .VER ---
    if (m.message?.imageMessage || m.message?.videoMessage) {
      if (!global._savedPhotos) global._savedPhotos = new Map()
      const chat = getChat(m)
      try {
        const buf = await downloadMediaMessage(m, conn, {})
        global._savedPhotos.set(m.key.id, { buffer: buf, chat, sender: m.key.participant })
      } catch (e) {
        console.log("Error saving media:", e.message)
      }
    }

    // --- NOTIFICAR CAMBIOS DE ADMIN ---
    if (m.messageStubType === 29 || m.messageStubType === 30) {
      const id = m.key.remoteJid
      if (!id.endsWith('@g.us')) return
      const params = m.messageStubParameters || []
      const action = m.messageStubType === 29 ? 'promote' : 'demote'
      const actorJid = m.key?.participant || ''
      const affected = params
        .map(j => j.includes('@') ? j : j + '@s.whatsapp.net')
        .filter(j => j.split('@')[0].length > 5)
      const allJids = [actorJid, ...affected].filter(Boolean)
      const actorMention = actorJid ? ` @${actorJid.split('@')[0]}` : ''
      const affectedMentions = affected.map(j => `@${j.split('@')[0]}`).join(', ')
      const text = action === 'promote'
        ? `⭐${actorMention} promovió a ${affectedMentions} como admin`
        : `⬇️${actorMention} quitó admin a ${affectedMentions}`
      if (text.length > 5) {
        await conn.sendMessage(id, { text, mentions: allJids }).catch(() => {})
      }
      return
    }

    if (!m?.message) return

    const chat = getChat(m)
    if (!chat) return

    const isGroup = chat.endsWith('@g.us')
    const sender = normalizedId(m.key?.participant || m.key?.remoteJid)
    const botJid = normalizedId(conn.user?.id || conn.user?.jid || '')

    // --- TRACK MESSAGES FOR .PG ---
    if (m.key?.id && sender) {
      if (!global._msgLog[chat]) global._msgLog[chat] = {}
      if (!global._msgLog[chat][sender]) global._msgLog[chat][sender] = []
      const log = global._msgLog[chat][sender]
      log.push({ id: m.key.id, participant: m.key.participant, fromMe: m.key.fromMe })
      if (log.length > 20) log.splice(0, log.length - 20)
    }

    // --- MUTE SYSTEM ---
    if (isGroup && global.db.data?.muted?.includes(sender) && sender !== botJid) {
      try {
        await conn.sendMessage(chat, { delete: { remoteJid: m.key.remoteJid, fromMe: false, id: m.key.id, participant: m.key.participant } })
      } catch (e) {
        console.log("Mute delete error:", e)
      }
      return
    }

    // --- AFK AUTO-REMOVE: si el usuario AFK escribe algo, salir de AFK ---
    if (isGroup && global.db.data?.afk?.[sender]) {
      const afkData = global.db.data.afk[sender]
      delete global.db.data.afk[sender]
      const elapsed = Math.floor((Date.now() - afkData.since) / 1000)
      const mins = Math.floor(elapsed / 60)
      const secs = elapsed % 60
      const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
      try {
        const raw = JSON.parse(fs.readFileSync(dataFile, 'utf8') || '{}')
        if (raw.data?.afk?.[sender]) delete raw.data.afk[sender]
        fs.writeFileSync(dataFile, JSON.stringify(raw, null, 2))
      } catch {}
      await conn.sendMessage(chat, {
        text: `✨ Bienvenido de vuelta!\n\nEstuviste AFK durante ${timeStr}`
      }, { quoted: m })
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

    // --- AUTORESPONDER (per-group) ---
    if (isGroup) {
      const textContent =
        m.message.conversation ||
        m.message.extendedTextMessage?.text ||
        ''
      const ar = global.db.data?.autoresponder || {}
      const groupTriggers = { ...(ar['global'] || {}), ...(ar[chat] || {}) }
      for (const [trigger, response] of Object.entries(groupTriggers)) {
        if (textContent.toLowerCase().includes(trigger.toLowerCase())) {
          await conn.sendMessage(chat, { text: response }, { quoted: m })
          break
        }
      }
    }

    // --- ANTIVIRGENES: borrar mensaje y expulsar si comparten contacto ---
    if (isGroup && global.db.data?.antivirgenes?.includes(chat) && (m.message?.contactMessage || m.message?.contactsArrayMessage)) {
      const target = m.key?.participant || m.key?.remoteJid
      if (target && sender !== botJid) {
        conn.sendMessage(chat, { delete: { remoteJid: chat, fromMe: false, id: m.key.id, participant: m.key.participant } }).catch(() => {})
        await conn.groupParticipantsUpdate(chat, [target], 'remove').catch(() => {})
      }
      return
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
