function getJid(m) {
    return m?.key?.remoteJid || m?.chat || m?.sender || ""
}

import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} from '@whiskeysockets/baileys'

import P from 'pino'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { isBanned } from './lib/perms.js'

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
    banned: [],
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
      try {
        execSync('yt-dlp -U', { timeout: 30000, stdio: 'pipe' })
        console.log("✅ yt-dlp actualizado")
      } catch (e) {
        console.log("⚠️ No se pudo actualizar yt-dlp:", e.message)
      }
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
      }
    } catch {}
  }

  function saveDB() {
    try {
      fs.writeFileSync(dataFile, JSON.stringify({ contacts: global.db.contacts || {} }, null, 2))
    } catch {}
  }

  if (!global.db.contacts) global.db.contacts = {}
  if (!conn.contacts) conn.contacts = {}
  if (!global.db.data) global.db.data = {}
  if (!global.db.data.muted) global.db.data.muted = []
  if (!global.db.data.banned) global.db.data.banned = []
  if (!global.db.data.antivirgenes) global.db.data.antivirgenes = []
  if (!global.db.data.autoresponder) global.db.data.autoresponder = {}
  if (!global.db.data.afk) global.db.data.afk = {}

  global._msgStore = {}
  global._snipes = {}
  global._extraOwners = []
  global._disabledCmds = new Map()
  const _cmdsDir = path.dirname(fileURLToPath(import.meta.url))
  global._validCommands = new Set(
    fs.readdirSync(path.join(_cmdsDir, 'commands'))
      .filter(f => f.endsWith('.js'))
      .map(f => f.replace(/\.js$/, ''))
  )

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

  function getMessageText(m) {
    const msg = m.message
    if (!msg) return ''
    if (msg.conversation) return msg.conversation
    if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text
    if (msg.imageMessage?.caption) return msg.imageMessage.caption
    if (msg.videoMessage?.caption) return msg.videoMessage.caption
    if (msg.documentMessage?.caption) return msg.documentMessage.caption
    if (msg.audioMessage) return '🎵 Audio'
    if (msg.stickerMessage) return '🎨 Sticker'
    if (msg.contactMessage) return '👤 Contacto'
    if (msg.locationMessage) return '📍 Ubicación'
    return '*Sin texto*'
  }

  // --- DETECT DELETIONS VIA messages.update ---
  conn.ev.on('messages.update', (updates) => {
    for (const { key, update } of updates) {
      if (!key?.id || !key?.remoteJid) continue
      if (update?.messageStubType === 25) {
        const chat = key.remoteJid
        if (!chat.endsWith('@g.us')) continue
        // Try by original message ID
        if (global._msgStore[key.id]) {
          if (!global._snipes[chat]) global._snipes[chat] = []
          global._snipes[chat].unshift(global._msgStore[key.id])
          if (global._snipes[chat].length > 5) global._snipes[chat].pop()
          delete global._msgStore[key.id]
        } else {
          // Fallback: find NEWEST by participant
          const deletedUser = normalizedId(key.participant)
          if (deletedUser) {
            let foundKey = null
            let foundTs = 0
            for (const [msgId, msg] of Object.entries(global._msgStore)) {
              if (msg.chat === chat && msg.sender === deletedUser && (msg.timestamp || 0) >= foundTs) {
                foundKey = msgId
                foundTs = msg.timestamp || 0
              }
            }
            if (foundKey) {
              if (!global._snipes[chat]) global._snipes[chat] = []
              global._snipes[chat].unshift(global._msgStore[foundKey])
              if (global._snipes[chat].length > 5) global._snipes[chat].pop()
              delete global._msgStore[foundKey]
            }
          }
        }
      }
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

    // --- DETECT REVOKED MESSAGES FOR .SNIPE ---
    if (m.message?.protocolMessage?.type === 0) {
      const origKey = m.message.protocolMessage.key
      const origChat = origKey.remoteJid
      if (origChat?.endsWith('@g.us') && global._msgStore[origKey.id]) {
        if (!global._snipes[origChat]) global._snipes[origChat] = []
        global._snipes[origChat].unshift(global._msgStore[origKey.id])
        if (global._snipes[origChat].length > 5) global._snipes[origChat].pop()
        delete global._msgStore[origKey.id]
      }
      return
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

    // --- DETECT REVOKED MESSAGES VIA STUB TYPE ---
    if (m.messageStubType === 25) {
      const chat = m.key.remoteJid
      if (chat?.endsWith('@g.us')) {
        // Try by system message ID (protocolMessage case)
        if (global._msgStore[m.key.id]) {
          if (!global._snipes[chat]) global._snipes[chat] = []
          global._snipes[chat].unshift(global._msgStore[m.key.id])
          if (global._snipes[chat].length > 5) global._snipes[chat].pop()
          delete global._msgStore[m.key.id]
        } else {
          // Admin deleted someone else's msg — find NEWEST by sender from stub parameters
          const params = m.messageStubParameters || []
          const deletedUser = params.length > 0 ? normalizedId(params[0]) : null
          if (deletedUser) {
            let foundKey = null
            let foundTs = 0
            for (const [msgId, msg] of Object.entries(global._msgStore)) {
              if (msg.chat === chat && msg.sender === deletedUser && (msg.timestamp || 0) >= foundTs) {
                foundKey = msgId
                foundTs = msg.timestamp || 0
              }
            }
            if (foundKey) {
              if (!global._snipes[chat]) global._snipes[chat] = []
              global._snipes[chat].unshift(global._msgStore[foundKey])
              if (global._snipes[chat].length > 5) global._snipes[chat].pop()
              delete global._msgStore[foundKey]
            }
          }
        }
      }
      return
    }

    if (!m?.message) return

    const chat = getChat(m)
    if (!chat) return

    const isGroup = chat.endsWith('@g.us')
    if (!isGroup) return
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

    // --- STORE MESSAGE CONTENT FOR .SNIPE ---
    const msgText = getMessageText(m)
    global._msgStore[m.key.id] = {
      content: msgText,
      sender: sender,
      chat: chat,
      timestamp: m.messageTimestamp || Date.now(),
      imageMessage: m.message?.imageMessage || null,
      videoMessage: m.message?.videoMessage || null
    }
    const storeKeys = Object.keys(global._msgStore)
    if (storeKeys.length > 1000) {
      const toDelete = storeKeys.slice(0, 500)
      for (const k of toDelete) delete global._msgStore[k]
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

    // --- BANNED CHECK: ignorar silenciosamente a usuarios baneados ---
    if (isBanned(sender, global.db) && sender !== botJid) {
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

    const trimmed = text.trim()
    const args = trimmed.split(/ +/)
    let cmd = args[0].toLowerCase()
    let cmdArgs = args.slice(1)

    if (cmd === 'xyb' && args.length > 1) {
      cmd = args[1].toLowerCase()
      cmdArgs = args.slice(2)
    }

    const commandName = cmd.replace(/^[.!]/, '')

    // --- VALIDATE COMMAND against known files ---
    if (commandName !== 's' && commandName !== 'sticker' && commandName !== 'n' && commandName !== 'notify' && !global._validCommands?.has(commandName)) {
      return
    }

    // --- DISABLED COMMANDS CHECK ---
    if (commandName !== 'cmdoff' && commandName !== 'cmdon' && global._disabledCmds?.has(commandName)) {
      const ownerWhoDisabled = global._disabledCmds.get(commandName)
      const ownerName = getName(ownerWhoDisabled) || ownerWhoDisabled?.split('@')[0] || 'owner'
      await conn.sendMessage(chat, {
        text: `"${commandName}" está desactivado por ${ownerName}`
      }, { quoted: m })
      return
    }

    // Alias: .s → sticker
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

    // Alias: .n → notify
    if (commandName === 'n' || commandName === 'notify') {
      try {
        const mod = await import(`./commands/notify.js`).catch(() => null)
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
