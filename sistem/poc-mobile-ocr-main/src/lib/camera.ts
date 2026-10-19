export function getCameraErrorText(e: unknown): string {
  const name =
    typeof e === 'object' && e !== null && 'name' in e && typeof (e as { name?: unknown }).name === 'string'
      ? (e as { name: string }).name
      : ''
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Izin kamera ditolak. Ketuk "Izinkan" saat browser meminta akses kamera, lalu coba lagi.'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'Kamera tidak ditemukan di perangkat ini.'
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi kamera lain, lalu coba lagi.'
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return 'Resolusi/mode kamera tidak didukung perangkat ini. Coba pakai perangkat lain.'
    case 'SecurityError':
      return 'Akses kamera diblokir — halaman harus HTTPS atau localhost. Input manual / upload tetap tersedia.'
    case 'AbortError':
      return 'Pembukaan kamera dibatalkan.'
    default:
      if (name === 'TypeError') {
        return 'Lingkungan tidak mendukung kamera (butuh HTTPS + browser modern).'
      }
      return e instanceof Error && e.message ? e.message : 'Kamera tidak tersedia'
  }
}

export async function startCamera(
  videoEl: HTMLVideoElement,
  facingMode: 'environment' | 'user' = 'environment',
): Promise<MediaStream> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.getUserMedia !== 'function'
  ) {
    throw new Error('Lingkungan tidak mendukung kamera (butuh HTTPS + browser modern).')
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: facingMode },
      // Naikkan resolusi supaya QR kecil tetap terbaca
      width: { ideal: 1920, min: 1280 },
      height: { ideal: 1080, min: 720 },
      // Continuous autofocus via advanced constraints (Chrome Android support)
      advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
    },
    audio: false,
  })

  // Set torch & zoom capabilities jika tersedia (best-effort)
  const track = stream.getVideoTracks()[0]
  if (track && 'getCapabilities' in track) {
    try {
      const caps = (track as MediaStreamTrack & { getCapabilities?: () => MediaTrackCapabilities }).getCapabilities?.()
      if (caps && 'focusMode' in caps) {
        await (track as MediaStreamTrack & { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
          advanced: [{ focusMode: 'continuous' }],
        })
      }
    } catch {
      // ignore — fokus default tetap dipakai
    }
  }

  videoEl.srcObject = stream
  try {
    await videoEl.play()
  } catch (e) {
    const name = (e as Error)?.name
    if (name !== 'AbortError') {
      stream.getTracks().forEach((t) => t.stop())
      throw e
    }
  }
  return stream
}

export function stopCamera(stream: MediaStream | null) {
  if (!stream) return
  stream.getTracks().forEach((t) => t.stop())
}

export async function captureFrameToBlob(
  videoEl: HTMLVideoElement,
  options: { quality?: number; maxWidth?: number } = {},
): Promise<Blob> {
  const { quality = 0.9, maxWidth = 1080 } = options
  const canvas = document.createElement('canvas')
  const ratio = videoEl.videoHeight / videoEl.videoWidth
  const w = Math.min(maxWidth, videoEl.videoWidth)
  const h = Math.round(w * ratio)
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(videoEl, 0, 0, w, h)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/jpeg',
      quality,
    )
  })
}

/**
 * Capture frame dengan crop ROI di tengah — matching bracket overlay di UI.
 * widthRatio/heightRatio = porsi frame yang di-crop (0-1).
 */
export async function captureROIToBlob(
  videoEl: HTMLVideoElement,
  options: { widthRatio?: number; heightRatio?: number; quality?: number } = {},
): Promise<Blob> {
  const { widthRatio = 0.7, heightRatio = 0.35, quality = 0.92 } = options
  const vw = videoEl.videoWidth
  const vh = videoEl.videoHeight
  const cropW = Math.round(vw * widthRatio)
  const cropH = Math.round(vh * heightRatio)
  const cropX = Math.round((vw - cropW) / 2)
  const cropY = Math.round((vh - cropH) / 2)

  const canvas = document.createElement('canvas')
  canvas.width = cropW
  canvas.height = cropH
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(videoEl, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('roi capture failed'))),
      'image/jpeg',
      quality,
    )
  })
}

export async function isCameraAvailable(): Promise<boolean> {
  if (!navigator.mediaDevices?.getUserMedia) return false
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.some((d) => d.kind === 'videoinput')
  } catch {
    return false
  }
}
