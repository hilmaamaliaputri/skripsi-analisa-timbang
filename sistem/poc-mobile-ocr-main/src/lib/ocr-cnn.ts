/**
 * Custom CNN OCR via ONNX Runtime Web.
 * Drop-in replacement untuk Tesseract.js — function signature identik.
 *
 * Status: BETA — pakai model synthetic baseline (50% accuracy).
 * Production-ready setelah real data training (≥80% accuracy target).
 */
import * as ort from 'onnxruntime-web'
import type { OCRResult } from '@/types/ocr'
import { blobToImage } from './image'

// ─── Vocab harus match training/config.py ───
const VOCAB = '0123456789.'
const NUM_CLASSES = VOCAB.length + 1 // +1 untuk CTC blank
const BLANK_INDEX = VOCAB.length

// ─── Image dimensions match training ───
const IMG_HEIGHT = 64
const IMG_WIDTH = 256

let sessionPromise: Promise<ort.InferenceSession> | null = null
let modelPath = '/models/cnn_synth_v1.onnx'

export function setModelPath(path: string) {
  if (path !== modelPath) {
    modelPath = path
    sessionPromise = null // force reload
  }
}

/** Lazy-load ONNX model. Cache session setelah pertama kali load. */
async function getSession(): Promise<ort.InferenceSession> {
  if (!sessionPromise) {
    console.debug('[OCR-CNN] Loading model:', modelPath)
    const t0 = performance.now()
    sessionPromise = ort.InferenceSession.create(modelPath, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    })
    sessionPromise.then(() =>
      console.debug(`[OCR-CNN] Model loaded in ${(performance.now() - t0).toFixed(0)}ms`),
    )
  }
  return sessionPromise
}

/**
 * Preprocess image: grayscale, resize aspect-aware, normalize 0-1.
 * MUST match training/train.py:load_image() supaya inference correct.
 */
async function preprocessImage(blob: Blob): Promise<Float32Array> {
  const img = await blobToImage(blob)

  const canvas = document.createElement('canvas')
  canvas.width = IMG_WIDTH
  canvas.height = IMG_HEIGHT
  const ctx = canvas.getContext('2d')!

  // White background (matches training preprocessing padding)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, IMG_WIDTH, IMG_HEIGHT)

  // Aspect-aware fit: scale to height, pad sides
  const ratio = img.width / img.height
  const targetH = IMG_HEIGHT
  const newW = Math.min(IMG_WIDTH, Math.round(targetH * ratio))
  const offsetX = Math.round((IMG_WIDTH - newW) / 2)
  ctx.drawImage(img, offsetX, 0, newW, targetH)

  const imageData = ctx.getImageData(0, 0, IMG_WIDTH, IMG_HEIGHT)
  const data = imageData.data
  const tensor = new Float32Array(IMG_HEIGHT * IMG_WIDTH * 1)

  // RGB → grayscale (BT.601 — match cv2.IMREAD_GRAYSCALE) + normalize 0-1
  for (let i = 0; i < IMG_HEIGHT * IMG_WIDTH; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    const gray = 0.299 * r + 0.587 * g + 0.114 * b
    tensor[i] = gray / 255.0
  }

  return tensor
}

/**
 * Greedy CTC decoder:
 *   1. Argmax per timestep
 *   2. Collapse consecutive duplicates
 *   3. Remove blanks
 */
function ctcDecode(
  logits: Float32Array,
  T: number,
  classes: number,
): { text: string; confidence: number } {
  const argmax: number[] = []
  const probs: number[] = []

  for (let t = 0; t < T; t++) {
    let bestIdx = 0
    let bestProb = -Infinity
    for (let c = 0; c < classes; c++) {
      const p = logits[t * classes + c]
      if (p > bestProb) {
        bestProb = p
        bestIdx = c
      }
    }
    argmax.push(bestIdx)
    probs.push(bestProb)
  }

  const chars: string[] = []
  const charProbs: number[] = []
  let prev = -1
  for (let t = 0; t < T; t++) {
    const c = argmax[t]
    if (c !== prev && c < BLANK_INDEX) {
      chars.push(VOCAB[c])
      charProbs.push(probs[t])
    }
    prev = c
  }

  const text = chars.join('')
  const confidence =
    charProbs.length > 0 ? charProbs.reduce((a, b) => a + b, 0) / charProbs.length : 0

  return { text, confidence }
}

/**
 * Recognize image via Custom CNN ONNX.
 * Drop-in replacement untuk recognizeBlob (Tesseract).
 */
export async function recognizeBlobCNN(blob: Blob): Promise<OCRResult> {
  const start = performance.now()

  const session = await getSession()
  const inputData = await preprocessImage(blob)
  const inputTensor = new ort.Tensor('float32', inputData, [1, IMG_HEIGHT, IMG_WIDTH, 1])

  const inputName = session.inputNames[0]
  const output = await session.run({ [inputName]: inputTensor })
  const outputName = session.outputNames[0]
  const logits = output[outputName].data as Float32Array
  const dims = output[outputName].dims // [1, T, classes]
  const T = dims[1] as number
  const C = dims[2] as number

  const { text, confidence } = ctcDecode(logits, T, C)

  const durationMs = performance.now() - start
  console.debug('[OCR-CNN] result:', { text, confidence, durationMs, T, C })

  return { text, confidence, durationMs }
}

/** Preload model in background (mis. saat splash/login). */
export async function preloadCNN(): Promise<void> {
  await getSession()
}
