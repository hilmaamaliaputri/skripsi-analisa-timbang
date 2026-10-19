import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CameraView } from '@/components/CameraView'
import { TopBar } from '@/components/TopBar'
import { scanQRFromVideo } from '@/lib/qr'
import { captureFrameToBlob } from '@/lib/camera'
import { saveImageBlob } from '@/lib/db'
import { useCapture } from '@/store/capture'
import { IconChevR } from '@/components/Icons'

export default function CaptureQR() {
  const navigate = useNavigate()
  const setQR = useCapture((s) => s.setQR)
  const [detected, setDetected] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [scannerActive, setScannerActive] = useState(false)
  const [manual, setManual] = useState('')
  const [manualMode, setManualMode] = useState(false)
  const stopRef = useRef<(() => void) | null>(null)
  const detectedRef = useRef(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    return () => {
      stopRef.current?.()
    }
  }, [])

  const handleVideoReady = async (video: HTMLVideoElement) => {
    videoRef.current = video
    setScanError(null)
    try {
      const stop = await scanQRFromVideo(
        video,
        (result) => {
          if (!detectedRef.current) {
            detectedRef.current = true
            setDetected(result.text)
            if ('vibrate' in navigator) navigator.vibrate?.(60)
          }
        },
        (err) => {
          setScanError(err.message)
        },
      )
      stopRef.current = stop
      setScannerActive(true)
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Scanner gagal start')
    }
  }

  const handleConfirm = async () => {
    const code = manualMode ? manual.trim() : detected
    if (!code) return

    let blobId = 'manual-' + Date.now()
    if (videoRef.current && !manualMode) {
      try {
        const blob = await captureFrameToBlob(videoRef.current, { maxWidth: 720, quality: 0.8 })
        blobId = await saveImageBlob(blob)
      } catch (e) {
        console.warn('capture frame failed', e)
      }
    }
    setQR(code, blobId)
    navigate('/capture/ocr')
  }

  return (
    <div className="min-h-dvh flex flex-col bg-ink-0">
      <TopBar title="SCAN QR KARUNG" subtitle="STEP 01 / 03" back="/dashboard" />

      <div className="grid grid-cols-3 gap-1.5 px-5 -mt-1 mb-2">
        <div className="h-1 bg-safety" />
        <div className="h-1 bg-edge" />
        <div className="h-1 bg-edge" />
      </div>

      {!manualMode ? (
        <CameraView className="flex-1 relative" onReady={handleVideoReady}>
          {/* Scan frame */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-[260px] h-[260px]">
              <div className="bracket tl" />
              <div className="bracket tr" />
              <div className="bracket bl" />
              <div className="bracket br" />
              {scannerActive && !detected && (
                <div
                  className="absolute left-2 right-2 h-0.5 bg-safety"
                  style={{
                    boxShadow: '0 0 12px #fbbf24',
                    animation: 'scanLine 2.4s ease-in-out infinite',
                  }}
                />
              )}
            </div>
          </div>

          {/* Scanner status indicator (top of camera) */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
            {scanError ? (
              <div className="bg-err/90 text-white text-[10px] px-3 py-1.5 font-mono tracking-widest">
                ⚠ {scanError}
              </div>
            ) : detected ? (
              <div className="bg-ok/90 text-white text-[10px] px-3 py-1.5 font-mono tracking-widest">
                ✓ QR DITERIMA
              </div>
            ) : scannerActive ? (
              <div className="bg-obsidian/85 backdrop-blur text-safety text-[10px] px-3 py-1.5 font-mono tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-safety rounded-full pulse" />
                SCANNING…
              </div>
            ) : (
              <div className="bg-obsidian/85 backdrop-blur text-white text-[10px] px-3 py-1.5 font-mono tracking-widest">
                MEMUAT KAMERA…
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 pt-12 bg-gradient-to-t from-obsidian/95 via-obsidian/70 to-transparent">
            {detected ? (
              <div className="bg-ok/20 border border-ok/60 backdrop-blur-sm px-4 py-3 mb-4">
                <div className="font-mono text-[10px] text-ok tracking-widest">QR TERDETEKSI</div>
                <div className="font-mono text-base text-white mt-1 truncate">{detected}</div>
              </div>
            ) : (
              <div className="text-center mb-4">
                <p className="font-display text-base tracking-wide text-white">ARAHKAN KE QR</p>
                <p className="font-mono text-[10px] text-white/70 mt-1 tracking-widest">PADA KARUNG · AKAN TERDETEKSI OTOMATIS</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setManualMode(true)}
                className="flex-1 h-12 border border-white/30 bg-white/10 backdrop-blur-sm font-mono text-xs tracking-widest text-white"
              >
                INPUT MANUAL
              </button>
              <button
                onClick={handleConfirm}
                disabled={!detected}
                className="flex-1 h-12 bg-safety text-obsidian font-display text-base tracking-wider flex items-center justify-center gap-2 disabled:opacity-40"
              >
                LANJUT
                <IconChevR className="w-4 h-4" />
              </button>
            </div>
          </div>
        </CameraView>
      ) : (
        <div className="flex-1 flex flex-col px-5 py-6">
          <div className="font-mono text-[10px] text-bone-3 tracking-[0.3em] mb-2">// INPUT MANUAL</div>
          <input
            type="text"
            value={manual}
            onChange={(e) => setManual(e.target.value.toUpperCase())}
            placeholder="ABCD1234"
            autoFocus
            className="bg-ink-1 border border-edge px-4 h-14 font-mono text-base text-bone-0 tracking-wider outline-none focus:border-safety"
          />
          <p className="font-mono text-[10px] text-bone-3 mt-2">Masukkan kode QR jika scan otomatis gagal</p>

          <div className="mt-auto flex gap-2">
            <button
              onClick={() => setManualMode(false)}
              className="flex-1 h-12 border border-edge bg-ink-1 font-mono text-xs tracking-widest text-bone-1"
            >
              KEMBALI SCAN
            </button>
            <button
              onClick={handleConfirm}
              disabled={!manual.trim()}
              className="flex-1 h-12 bg-safety text-obsidian font-display text-base tracking-wider disabled:opacity-40"
            >
              LANJUT
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
