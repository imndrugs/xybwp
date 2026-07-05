const BOT = '*CKV BOT*'

export function wm(text) {
  return `${text}\n\n${BOT}`
}

export function wmSuccess(text) {
  return wm(`✅ ${text}`)
}

export function wmError(text) {
  return wm(`❌ ${text}`)
}

export function wmInfo(text) {
  return wm(`ℹ️ ${text}`)
}

export function wmTikTok() {
  return wm('✅ *TikTok descargado correctamente*')
}

export function wmInstagram() {
  return wm('✅ *Instagram descargado correctamente*')
}

export function wmAudio() {
  return wm('✅ *Audio descargado correctamente*')
}

export { BOT }
