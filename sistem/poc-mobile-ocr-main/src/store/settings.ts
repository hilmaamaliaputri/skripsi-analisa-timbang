import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type OCRLanguage = 'ssd' | 'letsgodigital' | 'eng'

export const OCR_LANGUAGE_INFO: Record<OCRLanguage, { label: string; size: string; desc: string }> = {
  ssd: {
    label: 'SSD',
    size: '11 MB',
    desc: 'Community 7-segment trained · default',
  },
  letsgodigital: {
    label: 'LetsGoDigital',
    size: '144 KB',
    desc: 'Lightweight digital display model',
  },
  eng: {
    label: 'English (baseline)',
    size: 'CDN',
    desc: 'Generic Tesseract — comparison only',
  },
}

export type OCREngine = 'tesseract' | 'cnn'
export type CloudOCRMode = 'ocr' | 'pixtral'

interface SettingsState {
  ocrThreshold: number
  imageQuality: number
  imageMaxWidth: number
  multiFrameCount: number
  ocrLanguage: OCRLanguage
  trainingMode: boolean
  trainingScaleBrand: string
  ocrEngine: OCREngine
  cnnModelPath: string
  cloudFallbackEnabled: boolean
  mistralApiKey: string
  cloudFallbackThreshold: number
  cloudOcrMode: CloudOCRMode
  setOcrThreshold: (n: number) => void
  setImageQuality: (n: number) => void
  setImageMaxWidth: (n: number) => void
  setMultiFrameCount: (n: number) => void
  setOcrLanguage: (l: OCRLanguage) => void
  setTrainingMode: (b: boolean) => void
  setTrainingScaleBrand: (s: string) => void
  setOcrEngine: (e: OCREngine) => void
  setCnnModelPath: (p: string) => void
  setCloudFallbackEnabled: (b: boolean) => void
  setMistralApiKey: (k: string) => void
  setCloudFallbackThreshold: (n: number) => void
  setCloudOcrMode: (m: CloudOCRMode) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ocrThreshold: 0.80,
      imageQuality: 0.92,
      imageMaxWidth: 1280,
      multiFrameCount: 3,
      ocrLanguage: 'ssd',
      trainingMode: false,
      trainingScaleBrand: '',
      ocrEngine: 'tesseract',
      cnnModelPath: '/models/cnn_synth_v1.onnx',
      cloudFallbackEnabled: false,
      mistralApiKey: '',
      cloudFallbackThreshold: 0.80,
      cloudOcrMode: 'pixtral',
      setOcrThreshold: (n) => set({ ocrThreshold: n }),
      setImageQuality: (n) => set({ imageQuality: n }),
      setImageMaxWidth: (n) => set({ imageMaxWidth: n }),
      setMultiFrameCount: (n) => set({ multiFrameCount: n }),
      setOcrLanguage: (l) => set({ ocrLanguage: l }),
      setTrainingMode: (b) => set({ trainingMode: b }),
      setTrainingScaleBrand: (s) => set({ trainingScaleBrand: s }),
      setOcrEngine: (e) => set({ ocrEngine: e }),
      setCnnModelPath: (p) => set({ cnnModelPath: p }),
      setCloudFallbackEnabled: (b) => set({ cloudFallbackEnabled: b }),
      setMistralApiKey: (k) => set({ mistralApiKey: k }),
      setCloudFallbackThreshold: (n) => set({ cloudFallbackThreshold: n }),
      setCloudOcrMode: (m) => set({ cloudOcrMode: m }),
    }),
    {
      name: 'analisa-settings',
      version: 7,
      migrate: (persistedState) => {
        const s = persistedState as Partial<SettingsState>
        return {
          ocrThreshold: 0.80,
          imageQuality: s.imageQuality ?? 0.92,
          imageMaxWidth: s.imageMaxWidth ?? 1280,
          multiFrameCount: s.multiFrameCount ?? 3,
          ocrLanguage: (s.ocrLanguage as OCRLanguage) ?? 'ssd',
          trainingMode: false,
          trainingScaleBrand: s.trainingScaleBrand ?? '',
          ocrEngine: (s.ocrEngine as OCREngine) ?? 'tesseract',
          cnnModelPath: s.cnnModelPath ?? '/models/cnn_synth_v1.onnx',
          cloudFallbackEnabled: s.cloudFallbackEnabled ?? false,
          mistralApiKey: s.mistralApiKey ?? '',
          cloudFallbackThreshold: s.cloudFallbackThreshold ?? 0.80,
          cloudOcrMode: (s.cloudOcrMode as CloudOCRMode) ?? 'pixtral',
        } as SettingsState
      },
    },
  ),
)
