// Generate brand mark and favicon assets from src/assets/logo.png.
// Requires: npm i -D sharp png-to-ico
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"
import pngToIco from "png-to-ico"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, "..")

const src = path.join(root, "src", "assets", "logo.png")
const outDir = path.join(root, "public")

const SIZE = 512
const RADIUS = Math.round(SIZE * 0.22)
const LOGO_SCALE = 0.68
const LIGHT_BG = { r: 255, g: 255, b: 255, alpha: 1 }
const DARK_BG = { r: 11, g: 18, b: 32, alpha: 1 }

const roundedMask = Buffer.from(
  `<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${SIZE}" height="${SIZE}" rx="${RADIUS}" ry="${RADIUS}" />
  </svg>`
)

const baseSymbol = await sharp(src)
  .resize(SIZE, SIZE, { fit: "cover", position: "entropy" })
  .resize(Math.round(SIZE * LOGO_SCALE), Math.round(SIZE * LOGO_SCALE), {
    fit: "contain",
  })
  .png()
  .toBuffer()

const makeBase = async (bg) =>
  sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: bg,
    },
  })
    .composite([{ input: baseSymbol, gravity: "center" }])
    .composite([{ input: roundedMask, blend: "dest-in" }])
    .png()
    .toBuffer()

const writePng = async (buffer, name, size) => {
  const filePath = path.join(outDir, name)
  await sharp(buffer).resize(size, size).png().toFile(filePath)
  return filePath
}

const light = await makeBase(LIGHT_BG)
const dark = await makeBase(DARK_BG)

const png16 = await writePng(light, "favicon-16x16.png", 16)
const png32 = await writePng(light, "favicon-32x32.png", 32)
const png48 = await writePng(light, "favicon-48x48.png", 48)
await writePng(dark, "favicon-16x16-dark.png", 16)
await writePng(dark, "favicon-32x32-dark.png", 32)
await writePng(light, "apple-touch-icon.png", 180)
await writePng(dark, "android-chrome-192x192.png", 192)
await writePng(dark, "android-chrome-512x512.png", 512)
await writePng(light, "favicon.png", 32)

const ico = await pngToIco([png16, png32, png48])
await fs.writeFile(path.join(outDir, "favicon.ico"), ico)

console.log("Favicons generated in", outDir)
