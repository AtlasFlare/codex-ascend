import { deflateSync } from 'node:zlib'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const width = 2048
const height = 1152
const centerX = Math.round(width * 0.617)
const centerY = Math.round(height * 0.554)
const radiusX = 248
const radiusY = 142
const output = 'public/internal/camp-ii-edit-mask-v1.png'

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value
  for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  return crc >>> 0
})

const crc32 = (buffer) => {
  let crc = 0xffffffff
  for (const byte of buffer) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff]
  return (crc ^ 0xffffffff) >>> 0
}

const chunk = (type, data) => {
  const typeBytes = Buffer.from(type)
  const result = Buffer.alloc(data.length + 12)
  result.writeUInt32BE(data.length, 0)
  typeBytes.copy(result, 4)
  data.copy(result, 8)
  result.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), data.length + 8)
  return result
}

const rows = Buffer.alloc((width * 4 + 1) * height)
for (let y = 0; y < height; y += 1) {
  const row = y * (width * 4 + 1)
  rows[row] = 0
  for (let x = 0; x < width; x += 1) {
    const offset = row + 1 + x * 4
    const ellipse = ((x - centerX) / radiusX) ** 2 + ((y - centerY) / radiusY) ** 2
    rows[offset] = 255
    rows[offset + 1] = 255
    rows[offset + 2] = 255
    rows[offset + 3] = ellipse <= 1 ? 0 : 255
  }
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(width, 0)
ihdr.writeUInt32BE(height, 4)
ihdr[8] = 8
ihdr[9] = 6
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(rows, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])

await mkdir(dirname(output), { recursive: true })
await writeFile(output, png)
process.stdout.write(`${output} (${width}x${height}; edit center ${centerX},${centerY})\n`)
