import sharp from 'sharp'
import { readFileSync } from 'fs'

const svg = readFileSync('public/logo.svg')

// Create icons with padding on colored background
const sizes = [192, 512]

for (const size of sizes) {
  const padding = Math.round(size * 0.15)
  const innerSize = size - padding * 2

  await sharp(svg)
    .resize(innerSize, innerSize, { fit: 'contain', background: { r: 243, g: 246, b: 247, alpha: 1 } })
    .flatten({ background: { r: 243, g: 246, b: 247 } })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 243, g: 246, b: 247, alpha: 1 }
    })
    .png()
    .toFile(`public/icons/icon-${size}.png`)

  console.log(`Generated icon-${size}.png`)
}

console.log('Done!')
