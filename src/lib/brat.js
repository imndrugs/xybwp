import { createCanvas } from "@napi-rs/canvas"

export async function generateBrat(text) {
  const SIZE = 512
  const canvas = createCanvas(SIZE, SIZE)
  const ctx = canvas.getContext("2d")

  ctx.fillStyle = "#FFFFFF"
  ctx.fillRect(0, 0, SIZE, SIZE)

  ctx.fillStyle = "#000"

  const FONT = "sans-serif"

  let fontSize = 180

  function getLines(size) {
    ctx.font = `${size}px ${FONT}`
    const words = text.split(" ")
    const lines = []
    let line = ""
    const MAX_WIDTH = 430

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

  while (fontSize > 40) {
    const lines = getLines(fontSize)
    const totalHeight = lines.length * fontSize * 1.05
    if (totalHeight < 420) break
    fontSize -= 6
  }

  const lines = getLines(fontSize)
  const lineHeight = fontSize * 1.05
  const startY = SIZE / 2 - (lines.length * lineHeight) / 2 + lineHeight / 2

  ctx.textAlign = "center"
  ctx.textBaseline = "middle"

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], SIZE / 2, startY + i * lineHeight)
  }

  return canvas.toBuffer("image/png")
}
