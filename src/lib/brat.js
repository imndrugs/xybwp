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
    const MAX_WIDTH = 480

    for (const word of words) {
      const test = line ? line + " " + word : word
      if (ctx.measureText(test).width > MAX_WIDTH) {
        if (line) lines.push(line)
        line = word
      } else {
        line = test
      }
    }

    if (line) lines.push(line)
    return lines
  }

  let best = { fontSize: 20, lines: getLines(20), score: -Infinity }

  for (let size = 200; size >= 20; size -= 2) {
    const lines = getLines(size)
    const totalHeight = lines.length * size * 1.05

    if (totalHeight > SIZE) continue

    const coverage = totalHeight / SIZE
    const score = size * coverage

    if (score > best.score) {
      best = { fontSize: size, lines, score, totalHeight }
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
