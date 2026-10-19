export async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob)
  const img = new Image()
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
    img.src = url
  })
  URL.revokeObjectURL(url)
  return img
}

export async function cropToBlob(
  blob: Blob,
  bbox: { x: number; y: number; w: number; h: number },
  quality = 0.9,
): Promise<Blob> {
  const img = await blobToImage(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bbox.w
  canvas.height = bbox.h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, bbox.x, bbox.y, bbox.w, bbox.h, 0, 0, bbox.w, bbox.h)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('crop failed'))),
      'image/jpeg',
      quality,
    )
  })
}

/**
 * Preprocessing pipeline khusus 7-segment LED display.
 * 1. Boost red channel (LED merah punya nilai R tinggi, GB rendah)
 * 2. Otsu threshold (cari cutoff optimal otomatis)
 * 3. Invert hasil (Tesseract trained on black-on-white, LCD adalah white-on-black)
 * 4. Output high-quality JPEG untuk OCR
 */
export async function preprocessForOCR(blob: Blob): Promise<Blob> {
  const img = await blobToImage(blob)
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = imageData.data
  const total = canvas.width * canvas.height

  // ─── 1. Red-channel emphasis grayscale ───
  // LED merah dominan di R, lemah di G/B. Bobot 0.7/0.2/0.1 supaya pixel LED jadi terang
  // dan background hitam tetap gelap.
  const histogram = new Array<number>(256).fill(0)
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.min(255, Math.round(0.7 * d[i] + 0.2 * d[i + 1] + 0.1 * d[i + 2]))
    d[i] = d[i + 1] = d[i + 2] = v
    histogram[v]++
  }

  // ─── 2. Otsu threshold (between-class variance maximization) ───
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * histogram[i]

  let sumB = 0
  let wB = 0
  let maxVar = 0
  let threshold = 127

  for (let i = 0; i < 256; i++) {
    wB += histogram[i]
    if (wB === 0) continue
    const wF = total - wB
    if (wF === 0) break
    sumB += i * histogram[i]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const between = wB * wF * (mB - mF) * (mB - mF)
    if (between > maxVar) {
      maxVar = between
      threshold = i
    }
  }

  // ─── 3. Binarize + INVERT (LED white-on-black → black-on-white) ───
  for (let i = 0; i < d.length; i += 4) {
    const v = d[i] > threshold ? 0 : 255
    d[i] = d[i + 1] = d[i + 2] = v
  }

  ctx.putImageData(imageData, 0, 0)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('preprocess failed'))),
      'image/jpeg',
      0.95,
    )
  })
}

/**
 * Crop center horizontal strip — untuk 7-seg display yang biasanya wider than tall.
 * Bantu fokus OCR ke area yang paling mungkin berisi angka.
 */
export async function cropCenterStrip(blob: Blob, ratioHeight = 0.5): Promise<Blob> {
  const img = await blobToImage(blob)
  const w = img.width
  const h = Math.round(img.height * ratioHeight)
  const y = Math.round((img.height - h) / 2)
  return cropToBlob(blob, { x: 0, y, w, h }, 0.95)
}

/**
 * Upscale + tambah padding putih di sekeliling image.
 * Tesseract trained dengan asumsi text height ≥ 30-50px; image kecil
 * di-upscale supaya digit lebih besar = recognition lebih akurat.
 * Padding 12% mencegah digit "menempel" ke tepi (yg juga melemahkan OCR).
 */
export async function upscaleWithPadding(
  blob: Blob,
  options: { targetMinHeight?: number; paddingRatio?: number; bgColor?: string } = {},
): Promise<Blob> {
  const { targetMinHeight = 200, paddingRatio = 0.12, bgColor = '#ffffff' } = options
  const img = await blobToImage(blob)

  // Hitung scale factor — pastikan height ≥ targetMinHeight
  const scale = Math.max(1, targetMinHeight / img.height)
  const scaledW = Math.round(img.width * scale)
  const scaledH = Math.round(img.height * scale)
  const padX = Math.round(scaledW * paddingRatio)
  const padY = Math.round(scaledH * paddingRatio)

  const canvas = document.createElement('canvas')
  canvas.width = scaledW + padX * 2
  canvas.height = scaledH + padY * 2
  const ctx = canvas.getContext('2d')!

  // Background fill
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Smooth scaling untuk image quality
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, padX, padY, scaledW, scaledH)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('upscale failed'))),
      'image/jpeg',
      0.95,
    )
  })
}
