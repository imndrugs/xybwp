import { createCanvas } from "@napi-rs/canvas"

export async function generateBrat(text) {
  const SIZE = 512
  const canvas = createCanvas(SIZE, SIZE)
  const ctx = canvas.getContext("2d")

  ctx.fillStyle = "#FFFFFF"
  ctx.fillRect(0, 0, SIZE, SIZE)

  ctx.fillStyle = "#000"
  const FONT = "sans-serif"

  function getLines(size) {
    ctx.font = `${size}px ${FONT}`
    const words = text.split(" ")
    const lines = []
    let line = ""

    for (const word of words) {
      const test = line ? line + " " + word : word
      if (ctx.measureText(test).width > SIZE) {
        if (line) lines.push(line)
        line = word
      } else {
        line = test
      }
    }

    if (line) lines.push(line)
    return lines
  }

  function measure(size) {
    const lines = getLines(size)
    const totalHeight = lines.length * size * 1.05
    let maxLineWidth = 0
    for (const line of lines) {
      const w = ctx.measureText(line).width
      if (w > maxLineWidth) maxLineWidth = w
    }
    return { lines, totalHeight, maxLineWidth }
  }

  const MAX_OVERFLOW = 1.3

  let best = { fontSize: 12, lines: getLines(12), score: -Infinity }

  for (let size = 600; size >= 12; size -= 2) {
    const { lines, totalHeight, maxLineWidth } = measure(size)

    if (totalHeight > SIZE) continue

    const widthRatio = maxLineWidth / SIZE

    let score
    if (widthRatio <= 1) {
      score = size + (SIZE - totalHeight) * 0.2
    } else if (widthRatio <= MAX_OVERFLOW) {
      const penalty = (widthRatio - 1) / (MAX_OVERFLOW - 1)
      score = size * (1 - penalty * 0.3)
    } else {
      continue
    }

    if (score > best.score) {
      best = { fontSize: size, lines, score }
    }
  }

  const { fontSize, lines } = best
  const lineHeight = fontSize * 1.05
  const totalHeight = lines.length * lineHeight
  const startY = (SIZE - totalHeight) / 2 + lineHeight / 2

  ctx.textAlign = "center"
  ctx.textBaseline = "middle"

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], SIZE / 2, startY + i * lineHeight)
  }

  return canvas.toBuffer("image/png")
}
