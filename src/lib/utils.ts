export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ')
}

// CRC32 for S3 presigned URL uploads (required by AWS SDK v3)
export async function computeCRC32Base64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  // Build CRC32 lookup table
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    table[i] = c
  }
  let crc = 0xFFFFFFFF
  for (let i = 0; i < bytes.length; i++) crc = table[(crc ^ bytes[i]) & 0xFF]! ^ (crc >>> 8)
  crc = (crc ^ 0xFFFFFFFF) >>> 0
  // Big-endian 4 bytes → base64
  const arr = new Uint8Array([crc >>> 24, (crc >>> 16) & 0xFF, (crc >>> 8) & 0xFF, crc & 0xFF])
  return btoa(String.fromCharCode.apply(null, Array.from(arr)))
}
