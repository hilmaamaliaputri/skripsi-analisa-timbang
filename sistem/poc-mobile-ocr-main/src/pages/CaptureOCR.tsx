import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CameraView } from '@/components/CameraView'
import { TopBar } from '@/components/TopBar'
import { captureROIToBlob } from '@/lib/camera'
import { saveImageBlob } from '@/lib/db'
import { recognizeBlob, parseBerat, preloadOCR } from '@/lib/ocr'
import { recognizeBlobCNN, preloadCNN, setModelPath as setCnnModelPath } from '@/lib/ocr-cnn'
import { recognizeBlobCloud } from '@/lib/ocr-cloud'
import { DEFAULT_OCR_CONFIG } from '@/types/ocr'
import { useNetwork } from '@/store/network'
import { preprocessForOCR } from '@/lib/image'
import { useCapture } from '@/store/capture'
import { useSettings } from '@/store/settings'
import { nowISO } from '@/lib/utils'
import { IconCamera, IconCheck, IconEdit, IconUpload } from '@/components/Icons'
import { ManualCropEditor } from '@/components/ManualCropEditor'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// Bracket overlay matches these ratios — keep in sync with UI below.
// 70% width × 35% height of video frame, centered.
const ROI_WIDTH_RATIO = 0.7
const ROI_HEIGHT_RATIO = 0.35

export default function CaptureOCR() {
  const navigate = useNavigate()
  const draft = useCapture((s) => s.draft)
  const setDisplay = useCapture((s) => s.setDisplay)
  const setOCRImage = useCapture((s) => s.setOCRImage)
  const setOCR = useCapture((s) => s.setOCR)
  const multiFrameCount = useSettings((s) => s.multiFrameCount)
  const ocrThreshold = useSettings((s) => s.ocrThreshold)
  const ocrLanguage = useSettings((s) => s.ocrLanguage)
  const ocrEngine = useSettings((s) => s.ocrEngine)
  const cnnModelPath = useSettings((s) => s.cnnModelPath)
  const cloudFallbackEnabled = useSettings((s) => s.cloudFallbackEnabled)
  const mistralApiKey = useSettings((s) => s.mistralApiKey)
  const cloudFallbackThreshold = useSettings((s) => s.cloudFallbackThreshold)
  const cloudOcrMode = useSettings((s) => s.cloudOcrMode)
  const setCloudFallback = useCapture((s) => s.setCloudFallback)
  const online = useNetwork((s) => s.online)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [statusText, setStatusText] = useState<string>('SIAP CAPTURE · TAP SHUTTER')
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null)

  useEffect(() => {
    if (!draft.qr_code_value) {
      navigate('/capture/qr', { replace: true })
      return
    }
    if (ocrEngine === 'cnn') {
      setCnnModelPath(cnnModelPath)
      preloadCNN().catch((e) => console.warn('preload CNN failed', e))
    } else {
      preloadOCR().catch((e) => console.warn('preload OCR failed', e))
    }
  }, [draft.qr_code_value, navigate, ocrEngine, cnnModelPath])

  const runOCR = async (blob: Blob) => {
    const blobId = await saveImageBlob(blob)
    setDisplay(blobId)

    setStatusText(`OCR INFERENCE [${ocrEngine.toUpperCase()}]...`)
    console.log(`[CaptureOCR] Using engine: ${ocrEngine}`)
    const result =
      ocrEngine === 'cnn'
        ? await recognizeBlobCNN(blob)
        : await recognizeBlob(blob, {
            ...DEFAULT_OCR_CONFIG,
            language: ocrLanguage,
            langPath: ocrLanguage === 'eng' ? undefined : '/tesseract-data',
          })
    const berat = parseBerat(result.text)

    // Generate preprocessed view (untuk debug — tunjukkan apa yang OCR "lihat")
    try {
      const viz = await preprocessForOCR(blob)
      const vizId = await saveImageBlob(viz)
      setOCRImage(vizId)
    } catch (e) {
      console.warn('[OCR] preprocess viz failed', e)
    }

    if (berat === null) {
      setStatusText(`OCR GAGAL · TERBACA "${result.text || '—'}" · COBA LAGI`)
      setBusy(false)
      return
    }

    setOCR(berat, result.confidence, nowISO(), result.text, 1)
    navigate('/capture/review')
  }

  /**
   * Multi-frame voting: capture N frames, OCR semua, pilih best confidence.
   * Strategi sementara sebelum custom CNN ONNX siap (v0.2).
   */
  const handleShutter = async () => {
    if (!videoRef.current || busy) return
    setBusy(true)

    try {
      const N = Math.max(1, multiFrameCount)
      const frames: Blob[] = []

      console.log(`[CaptureOCR] Multi-frame capture · engine: ${ocrEngine.toUpperCase()}`)
      // Capture N frames dengan jarak 350ms (variasi kecil dari posisi/blur frame)
      for (let i = 0; i < N; i++) {
        setStatusText(`CAPTURING ${i + 1}/${N}...`)
        const blob = await captureROIToBlob(videoRef.current, {
          widthRatio: ROI_WIDTH_RATIO,
          heightRatio: ROI_HEIGHT_RATIO,
          quality: 0.92,
        })
        frames.push(blob)
        if (i < N - 1) await sleep(350)
      }

      // OCR semua frame paralel
      setStatusText(`ANALISIS ${N} FRAME...`)
      const ocrCfg = {
        ...DEFAULT_OCR_CONFIG,
        language: ocrLanguage,
        langPath: ocrLanguage === 'eng' ? undefined : '/tesseract-data',
      }
      const results = await Promise.all(
        frames.map(async (b, idx) => {
          try {
            const r =
              ocrEngine === 'cnn'
                ? await recognizeBlobCNN(b)
                : await recognizeBlob(b, ocrCfg)
            return { idx, blob: b, result: r, berat: parseBerat(r.text) }
          } catch (e) {
            console.warn('[OCR] frame', idx, 'failed', e)
            return { idx, blob: b, result: { text: '', confidence: 0, durationMs: 0 }, berat: null }
          }
        }),
      )

      // Filter hanya yang menghasilkan angka valid, sort by confidence desc
      const valid = results.filter((r) => r.berat !== null)
      console.debug('[OCR] multi-frame results:', results.map((r) => ({
        idx: r.idx,
        text: r.result.text,
        conf: r.result.confidence,
        berat: r.berat,
      })))

      if (valid.length === 0) {
        setStatusText('SEMUA FRAME GAGAL · ULANGI DENGAN POSISI LEBIH BAIK')
        setBusy(false)
        return
      }

      // Pilih frame dengan confidence tertinggi
      valid.sort((a, b) => b.result.confidence - a.result.confidence)
      const best = valid[0]

      const blobId = await saveImageBlob(best.blob)
      setDisplay(blobId)

      // Generate preprocessed view (debug visualisasi — apa yg OCR baca)
      try {
        const viz = await preprocessForOCR(best.blob)
        const vizId = await saveImageBlob(viz)
        setOCRImage(vizId)
      } catch (e) {
        console.warn('[OCR] preprocess viz failed', e)
      }

      // Save local OCR result first
      setOCR(best.berat!, best.result.confidence, nowISO(), best.result.text, valid.length, 'local')

      // ─── CLOUD FALLBACK (Mistral OCR) ───
      // Trigger jika: confidence local < threshold AND online AND cloud enabled
      const localConfidence = best.result.confidence
      const shouldFallback =
        cloudFallbackEnabled &&
        online &&
        mistralApiKey.trim().length > 0 &&
        localConfidence < cloudFallbackThreshold

      if (shouldFallback) {
        try {
          setStatusText(`☁ CLOUD FALLBACK · MISTRAL OCR...`)
          console.log('[CaptureOCR] Triggering Mistral OCR fallback')
          const cloudResult = await recognizeBlobCloud(best.blob, {
            apiKey: mistralApiKey,
            mode: cloudOcrMode,
          })
          const cloudBerat = parseBerat(cloudResult.text)
          if (cloudBerat !== null) {
            setCloudFallback(
              cloudResult.text,
              best.result.text,
              localConfidence,
              cloudResult.mode,
              cloudResult.rawResponse,
            )
            console.log('[CaptureOCR] Cloud fallback success:', cloudResult.text)
            setStatusText('✓ CLOUD READING · OPERATOR CONFIRM')
          } else {
            console.warn('[CaptureOCR] Cloud returned non-numeric:', cloudResult.text)
          }
        } catch (e) {
          console.error('[CaptureOCR] Cloud fallback failed:', e)
          setStatusText('⚠ CLOUD FALLBACK FAILED · USING LOCAL')
        }
      }

      const meetsThresh = best.result.confidence >= ocrThreshold
      setStatusText(
        meetsThresh
          ? `✓ TERBAIK ${Math.round(best.result.confidence * 100)}% (FRAME ${best.idx + 1}/${N})`
          : `⚠ TERBAIK ${Math.round(best.result.confidence * 100)}% < ${Math.round(ocrThreshold * 100)}% — REVIEW LALU ULANGI`,
      )

      navigate('/capture/review')
    } catch (e) {
      console.error(e)
      setStatusText('ERROR · ' + (e instanceof Error ? e.message : 'unknown'))
      setBusy(false)
    }
  }

  const handleManualCropTrigger = async () => {
    if (!videoRef.current || busy) return
    setBusy(true)
    setStatusText('CAPTURING...')
    try {
      // Capture full frame untuk manual cropping
      const { captureFrameToBlob } = await import('@/lib/camera')
      const fullBlob = await captureFrameToBlob(videoRef.current, { maxWidth: 1280, quality: 0.92 })
      setPendingBlob(fullBlob)
      setBusy(false)
      setStatusText('PILIH AREA DISPLAY')
    } catch (e) {
      console.error(e)
      setStatusText('ERROR · ' + (e instanceof Error ? e.message : 'unknown'))
      setBusy(false)
    }
  }

  const handleUploadClick = () => {
    if (busy) return
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // reset supaya bisa upload file sama lagi
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setStatusText('FILE BUKAN IMAGE')
      return
    }
    // Konversi ke Blob (File extends Blob jadi langsung pakai)
    setPendingBlob(file)
    setStatusText('PILIH AREA DISPLAY DARI UPLOAD')
  }

  const handleCropConfirm = async (cropped: Blob) => {
    setBusy(true)
    setStatusText('OCR INFERENCE...')
    setPendingBlob(null)
    try {
      await runOCR(cropped)
    } catch (e) {
      console.error(e)
      setStatusText('ERROR · ' + (e instanceof Error ? e.message : 'unknown'))
      setBusy(false)
    }
  }

  const handleCropCancel = () => {
    setPendingBlob(null)
    setStatusText('SIAP CAPTURE')
  }

  // Manual crop mode
  if (pendingBlob) {
    return <ManualCropEditor blob={pendingBlob} onConfirm={handleCropConfirm} onCancel={handleCropCancel} />
  }

  return (
    <div className="min-h-dvh flex flex-col bg-ink-0">
      <TopBar title="CAPTURE TIMBANGAN" subtitle="STEP 02 / 03" back />

      <div className="grid grid-cols-3 gap-1.5 px-5 -mt-1 mb-2">
        <div className="h-1 bg-safety" />
        <div className="h-1 bg-safety" />
        <div className="h-1 bg-edge" />
      </div>

      <div className="px-5 py-2">
        <div className="flex items-center gap-3 bg-ok/10 border border-ok/40 px-3 py-2">
          <IconCheck className="w-3.5 h-3.5 text-ok" />
          <span className="font-mono text-[10px] text-ok tracking-widest">QR DITERIMA</span>
          <span className="font-mono text-[10px] text-bone-0 ml-auto truncate">{draft.qr_code_value}</span>
        </div>
      </div>

      <CameraView
        className="flex-1 relative"
        onReady={(v) => {
          videoRef.current = v
        }}
      >
        {/* ROI bracket overlay — ratio MATCH widthRatio/heightRatio constant di atas */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="relative"
            style={{
              width: `${ROI_WIDTH_RATIO * 100}%`,
              aspectRatio: `${ROI_WIDTH_RATIO} / ${ROI_HEIGHT_RATIO}`,
              maxHeight: `${ROI_HEIGHT_RATIO * 100}%`,
            }}
          >
            <div className="bracket tl" />
            <div className="bracket tr" />
            <div className="bracket bl" />
            <div className="bracket br" />
            <div className="absolute -top-7 left-0 right-0 text-center">
              <span className="font-mono text-[9px] text-safety tracking-widest">[ FRAME · 7-SEG ]</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 pt-12 bg-gradient-to-t from-obsidian/95 via-obsidian/70 to-transparent">
          <div className="text-center mb-4">
            <p className="font-display text-base tracking-wide text-white">PASTIKAN DISPLAY DI DALAM FRAME</p>
            <p className="font-mono text-[10px] text-white/70 mt-1 tracking-widest">{statusText}</p>
          </div>
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handleManualCropTrigger}
              disabled={busy}
              className="w-12 h-12 border border-white/40 bg-white/10 backdrop-blur-sm rounded flex items-center justify-center disabled:opacity-50"
              aria-label="manual crop"
              title="Crop manual setelah capture"
            >
              <IconEdit className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleShutter}
              disabled={busy}
              className="w-20 h-20 rounded-full bg-safety flex items-center justify-center relative disabled:opacity-50"
              aria-label="shutter"
            >
              <span className="absolute inset-1 rounded-full border-4 border-obsidian" />
              <span className="absolute inset-3 rounded-full bg-safety flex items-center justify-center">
                <IconCamera className="w-7 h-7 text-obsidian" />
              </span>
            </button>
            <button
              onClick={handleUploadClick}
              disabled={busy}
              className="w-12 h-12 border-2 border-safety/70 bg-safety/15 backdrop-blur-sm rounded flex items-center justify-center disabled:opacity-50 relative"
              aria-label="upload image"
              title="Upload image untuk testing"
            >
              <IconUpload className="w-5 h-5 text-safety" />
              <span className="absolute -top-1.5 -right-1.5 px-1 py-0.5 bg-safety text-obsidian font-mono text-[8px] tracking-widest rounded">
                TEST
              </span>
            </button>
          </div>
          <div className="flex justify-between mt-2 font-mono text-[9px] text-white/60 tracking-widest">
            <span>CROP MANUAL</span>
            <span>SHUTTER (AUTO)</span>
            <span>UPLOAD</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelected}
            className="hidden"
          />
        </div>
      </CameraView>
    </div>
  )
}
