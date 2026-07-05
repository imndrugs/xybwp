const BASE = 'https://api.socialkit.dev'
const KEY = process.env.SOCIALKIT_KEY || ''

export async function socialkitDownload(platform, url) {
  if (!KEY) return null
  try {
    const r = await fetch(`${BASE}/${platform}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_key: KEY, url }),
      signal: AbortSignal.timeout(30000)
    })
    if (!r.ok) {
      console.log(`SocialKit ${platform}: HTTP ${r.status}`)
      return null
    }
    const d = await r.json()
    if (!d?.status && !d?.data) return null
    const data = d.data || d
    return {
      downloadUrl: data.downloadUrl || data.download_url || data.url || data.video || data.play || '',
      images: data.images || data.image_urls || [],
      music: data.music || data.audio || data.musicUrl || '',
      title: data.title || data.desc || ''
    }
  } catch (e) {
    console.log(`SocialKit ${platform} error:`, e.message)
    return null
  }
}
