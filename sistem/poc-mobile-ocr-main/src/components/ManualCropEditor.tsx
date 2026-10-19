import { useEffect, useRef, useState } from 'react'
import { TopBar } from './TopBar'
import { IconCheck, IconX } from './Icons'
import { cropToBlob } from '@/lib/image'

interface Props {
  blob: Blob
  onConfirm: (cropped: Blob) => void
  onCancel: () => void
}

interface CropBox {
  // Normalized 0–1, RELATIF KE IMAGE (bukan container) supaya crop akurat
  // saat image di-letterbox dengan object-contain.
  x: number
  y: number
  w: number
  h: number
}

const INITIAL_BOX: CropBox = { x: 0.15, y: 0.35, w: 0.7, h: 0.3 }

interface ImgDisplayedRect {
  // Posisi & ukuran image di dalam container (akibat object-contain letterbox)
  offsetX: number
  offsetY: number
  width: number
  height: number
}

export function ManualCropEditor({ blob, onConfirm, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null)
  const [imgRect, setImgRect] = useState<ImgDisplayedRect | null>(null)
  const [box, setBox] = useState<CropBox>(INITIAL_BOX)
  const [drag, setDrag] = useState<{
    mode: 'move' | 'resize'
    corner?: string
    sx: number
    sy: number
    ix: number
    iy: number
    iw: number
    ih: number
  } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const url = URL.createObjectURL(blob)
    setImgUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [blob])

  // Hitung posisi image dalam container saat resize / load
  const recomputeImgRect = () => {
    if (!containerRef.current || !imgDims) return
    const c = containerRef.current.getBoundingClientRect()
    const cAspect = c.width / c.height
    const iAspect = imgDims.w / imgDims.h

    let displayedW: number
    let displayedH: number
    let offsetX: number
    let offsetY: number

    if (iAspect > cAspect) {
      // Image lebih wide → fill width, letterbox top/bottom
      displayedW = c.width
      displayedH = c.width / iAspect
      offsetX = 0
      offsetY = (c.height - displayedH) / 2
    } else {
      // Image lebih tall → fill height, letterbox left/right
      displayedH = c.height
      displayedW = c.height * iAspect
      offsetX = (c.width - displayedW) / 2
      offsetY = 0
    }
    setImgRect({ offsetX, offsetY, width: displayedW, height: displayedH })
  }

  useEffect(() => {
    if (!imgDims) return
    recomputeImgRect()
    const handler = () => recomputeImgRect()
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgDims])

  const onImgLoad = () => {
    if (imgRef.current) {
      setImgDims({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight })
    }
  }

  // Convert pointer event coords → image-relative coords (0–1 of natural image)
  const pointerToImgNorm = (clientX: number, clientY: number): { x: number; y: number } | null => {
    if (!containerRef.current || !imgRect) return null
    const c = containerRef.current.getBoundingClientRect()
    const px = clientX - c.left - imgRect.offsetX
    const py = clientY - c.top - imgRect.offsetY
    return {
      x: clamp(px / imgRect.width, 0, 1),
      y: clamp(py / imgRect.height, 0, 1),
    }
  }

  const startDrag = (
    e: React.PointerEvent,
    mode: 'move' | 'resize',
    corner?: 'tl' | 'tr' | 'bl' | 'br',
  ) => {
    e.stopPropagation()
    e.preventDefault()
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    const norm = pointerToImgNorm(e.clientX, e.clientY)
    if (!norm) return
    setDrag({
      mode,
      corner,
      sx: norm.x,
      sy: norm.y,
      ix: box.x,
      iy: box.y,
      iw: box.w,
      ih: box.h,
    })
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return
    const norm = pointerToImgNorm(e.clientX, e.clientY)
    if (!norm) return
    const dx = norm.x - drag.sx
    const dy = norm.y - drag.sy

    if (drag.mode === 'move') {
      setBox({
        ...box,
        x: clamp(drag.ix + dx, 0, 1 - box.w),
        y: clamp(drag.iy + dy, 0, 1 - box.h),
      })
    } else if (drag.mode === 'resize') {
      const c = drag.corner!
      let nx = drag.ix
      let ny = drag.iy
      let nw = drag.iw
      let nh = drag.ih
      if (c.includes('l')) {
        nx = clamp(drag.ix + dx, 0, drag.ix + drag.iw - 0.05)
        nw = drag.iw - (nx - drag.ix)
      }
      if (c.includes('r')) {
        nw = clamp(drag.iw + dx, 0.05, 1 - drag.ix)
      }
      if (c.includes('t')) {
        ny = clamp(drag.iy + dy, 0, drag.iy + drag.ih - 0.05)
        nh = drag.ih - (ny - drag.iy)
      }
      if (c.includes('b')) {
        nh = clamp(drag.ih + dy, 0.05, 1 - drag.iy)
      }
      setBox({ x: nx, y: ny, w: nw, h: nh })
    }
  }

  const endDrag = () => setDrag(null)

  const handleConfirm = async () => {
    if (!imgDims || busy) return
    setBusy(true)
    try {
      const bbox = {
        x: Math.round(box.x * imgDims.w),
        y: Math.round(box.y * imgDims.h),
        w: Math.max(1, Math.round(box.w * imgDims.w)),
        h: Math.max(1, Math.round(box.h * imgDims.h)),
      }
      console.debug('[CROP]', { box, imgDims, bbox })
      const cropped = await cropToBlob(blob, bbox, 0.95)
      onConfirm(cropped)
    } catch (e) {
      console.error('crop failed', e)
      setBusy(false)
    }
  }

  // Visual style box: convert image-relative box → container-relative pixels
  const visualStyle = imgRect
    ? {
        left: `${imgRect.offsetX + box.x * imgRect.width}px`,
        top: `${imgRect.offsetY + box.y * imgRect.height}px`,
        width: `${box.w * imgRect.width}px`,
        height: `${box.h * imgRect.height}px`,
      }
    : { display: 'none' }

  return (
    <div className="min-h-dvh flex flex-col bg-ink-0">
      <TopBar title="PILIH AREA DISPLAY" subtitle="// MANUAL CROP" />

      <div className="px-5 py-2">
        <p className="font-mono text-[10px] text-bone-2 tracking-widest">
          DRAG KOTAK KUNING UNTUK PILIH AREA DISPLAY · TARIK SUDUT UNTUK RESIZE
        </p>
      </div>

      <div
        ref={containerRef}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        className="flex-1 relative bg-black overflow-hidden touch-none select-none"
      >
        {imgUrl && (
          <img
            ref={imgRef}
            src={imgUrl}
            alt="captured"
            onLoad={onImgLoad}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />
        )}

        {/* Crop box (relatif ke image, bukan container) */}
        {imgRect && (
          <div
            onPointerDown={(e) => startDrag(e, 'move')}
            className="absolute border-2 border-safety cursor-move"
            style={{
              ...visualStyle,
              boxShadow: '0 0 0 9999px rgba(10, 11, 13, 0.55), 0 0 12px rgba(251, 191, 36, 0.5)',
            }}
          >
            {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
              <div
                key={c}
                onPointerDown={(e) => startDrag(e, 'resize', c)}
                className="absolute w-5 h-5 bg-safety border-2 border-obsidian cursor-pointer"
                style={{
                  left: c.includes('l') ? -10 : undefined,
                  right: c.includes('r') ? -10 : undefined,
                  top: c.includes('t') ? -10 : undefined,
                  bottom: c.includes('b') ? -10 : undefined,
                  touchAction: 'none',
                }}
              />
            ))}
          </div>
        )}

        {/* Debug info overlay (kecil, kanan-bawah) */}
        {imgDims && (
          <div className="absolute top-2 right-2 bg-obsidian/80 text-white font-mono text-[9px] px-2 py-1 tracking-widest pointer-events-none">
            {imgDims.w}×{imgDims.h} · CROP {Math.round(box.w * 100)}×{Math.round(box.h * 100)}%
          </div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-edge bg-ink-1 flex gap-2">
        <button
          onClick={onCancel}
          disabled={busy}
          className="flex-1 h-12 border border-edge bg-ink-0 flex items-center justify-center gap-2 font-mono text-xs tracking-widest text-bone-1 disabled:opacity-50"
        >
          <IconX className="w-4 h-4" />
          BATAL
        </button>
        <button
          onClick={handleConfirm}
          disabled={busy}
          className="flex-1 h-12 bg-safety text-obsidian flex items-center justify-center gap-2 font-display text-base tracking-wider disabled:opacity-50"
        >
          <IconCheck className="w-5 h-5" />
          {busy ? 'PROSES...' : 'OCR AREA INI'}
        </button>
      </div>
    </div>
  )
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}
