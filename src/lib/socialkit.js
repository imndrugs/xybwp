const BASE = 'https://api.socialkit.dev'
const KEY = process.env.SOCIALKIT_KEY || ''

const ENDPOINTS = {
  tiktok: [
    '/tiktok/download',
    '/tiktok',
  ],
  instagram: [
    '/instagram/download',
    '/instagram',
  ]
}

export async function socialkitDownload(platform, url) {
  if (!KEY) return null
  const paths = ENDPOINTS[platform] || [`/${platform}/download`]
  for (const p of paths) {
    try {
      const r = await fetch(`${BASE}${p}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_key: KEY, url }),
        signal: AbortSignal.timeout(30000)
      })
      if (!r.ok) {
        console.log(`SocialKit ${platform} ${p}: HTTP ${r.status}`)
        continue
      }
      const d = await r.json()
      const data = d?.data || d
      if (!data) continue
      const result = {
        downloadUrl: data.downloadUrl || data.download_url || data.url || data.video || data.play || '',
        images: data.images || data.image_urls || [],
        music: data.music || data.audio || data.musicUrl || '',
        title: data.title || data.desc || ''
      }
      if (result.downloadUrl || result.images.length) return result
    } catch (e) {
      console.log(`SocialKit ${platform} ${p} error:`, e.message)
    }
  }
  return null
}
