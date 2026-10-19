import { useCallback, useEffect, useRef, useState } from 'react'
import { getCameraErrorText, startCamera } from '@/lib/camera'

interface Props {
  onReady?: (video: HTMLVideoElement) => void
  className?: string
  children?: React.ReactNode
}

export function CameraView({ onReady, className = '', children }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const start = useCallback(async () => {
    const videoEl = videoRef.current
    if (!videoEl) return
    setError(null)
    try {
      stopStream()
      const stream = await startCamera(videoEl)
      streamRef.current = stream
      onReady?.(videoEl)
    } catch (e) {
      setError(getCameraErrorText(e))
    }
  }, [onReady, stopStream])

  useEffect(() => {
    start()
    return stopStream
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-ink-1 ${className}`}>
        <div className="text-center px-6 py-12 max-w-sm">
          <div className="font-mono text-xs text-err tracking-widest mb-3">⚠ CAMERA ERROR</div>
          <div className="text-sm text-bone-1 break-words">{error}</div>
          <div className="text-xs text-bone-3 mt-4">
            Pastikan: (1) izin kamera diberikan, (2) pakai HTTPS atau localhost, (3) reload halaman.
          </div>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => start()}
              className="px-4 h-10 bg-safety text-obsidian font-mono text-xs tracking-widest"
            >
              COBA LAGI
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 h-10 border border-err/60 text-err font-mono text-xs tracking-widest"
            >
              RELOAD
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden bg-black ${className}`}>
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 w-full h-full object-cover"
      />
      {children}
    </div>
  )
}

export type { Props as CameraViewProps }
