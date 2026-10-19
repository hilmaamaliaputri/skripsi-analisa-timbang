import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '@/components/TopBar'
import { LCDDisplay } from '@/components/LCDDisplay'
import { useCapture } from '@/store/capture'
import { useAuth } from '@/store/auth'
import { useNetwork } from '@/store/network'
import { useSettings } from '@/store/settings'
import { saveTransaksi, getImageURL, getImageBlob } from '@/lib/db'
import { syncOne } from '@/lib/sync'
import { saveTrainingSample, copyBlobForTraining } from '@/lib/training'
import { parseBerat } from '@/lib/ocr'
import { recognizeBlobCloud } from '@/lib/ocr-cloud'
import { uuid, nowISO, generateTrxCode, getDeviceId, APP_VERSION, formatDateTimeID } from '@/lib/utils'
import { IconCheck, IconCopy, IconRefresh, IconQR, IconScale } from '@/components/Icons'

export default function Review() {
  const navigate = useNavigate()
  const draft = useCapture((s) => s.draft)
  const reset = useCapture((s) => s.reset)
  const confirmCloudResult = useCapture((s) => s.confirmCloudResult)
  const setCloudFallback = useCapture((s) => s.setCloudFallback)
  const cloudModeUsed = useCapture((s) => s.cloudModeUsed)
  const cloudRawResponse = useCapture((s) => s.cloudRawResponse)
  const operator = useAuth((s) => s.operator)!
  const online = useNetwork((s) => s.online)
  const ocrThreshold = useSettings((s) => s.ocrThreshold)
  const trainingMode = useSettings((s) => s.trainingMode)
  const trainingScaleBrand = useSettings((s) => s.trainingScaleBrand)
  const ocrLanguage = useSettings((s) => s.ocrLanguage)
  const ocrEngine = useSettings((s) => s.ocrEngine)
  const cnnModelPath = useSettings((s) => s.cnnModelPath)
  const cloudFallbackEnabled = useSettings((s) => s.cloudFallbackEnabled)
  const mistralApiKey = useSettings((s) => s.mistralApiKey)
  const cloudOcrMode = useSettings((s) => s.cloudOcrMode)
  const [saving, setSaving] = useState(false)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [displayUrl, setDisplayUrl] = useState<string | null>(null)
  const [ocrUrl, setOcrUrl] = useState<string | null>(null)
  // Training mode state
  const [groundTruth, setGroundTruth] = useState('')
  const [notes, setNotes] = useState('')
  const [trainSaved, setTrainSaved] = useState(false)

  useEffect(() => {
    if (!draft.berat_kg || !draft.qr_code_value) {
      navigate('/dashboard', { replace: true })
      return
    }
    Promise.all([
      getImageURL(draft.qr_image_blob_id),
      getImageURL(draft.display_image_blob_id),
      getImageURL(draft.ocr_image_blob_id),
    ]).then(([q, d, o]) => {
      setQrUrl(q)
      setDisplayUrl(d)
      setOcrUrl(o)
    })
    // Pre-fill ground truth dengan hasil OCR sebagai starting point (operator bisa correct)
    if (draft.ocr_raw_text) setGroundTruth(draft.ocr_raw_text)
  }, [draft, navigate])

  const conf = (draft.ocr_confidence || 0)
  const confPct = Math.round(conf * 100)
  const meetsThreshold = conf >= ocrThreshold

  // Cloud fallback state
  const hasCloudResult = !!draft.cloud_predicted_text
  const cloudConfirmed = draft.ocr_source === 'cloud-confirmed'
  // Saat cloud result ada tapi belum di-confirm, blokir save
  const needsCloudConfirm = hasCloudResult && !cloudConfirmed
  const [cloudEditValue, setCloudEditValue] = useState('')
  const [editingCloud, setEditingCloud] = useState(false)
  const [cloudLoading, setCloudLoading] = useState(false)
  const [cloudError, setCloudError] = useState<string | null>(null)

  const canTriggerCloud =
    !hasCloudResult &&
    online &&
    cloudFallbackEnabled &&
    mistralApiKey.trim().length > 0 &&
    !!draft.ocr_image_blob_id

  const handleTriggerCloud = async () => {
    // Mistral OCR butuh image NATURAL (warna asli), bukan post-processed binarized.
    // Prefer display_image_blob_id (foto LCD original) over ocr_image_blob_id (B&W).
    const blobId = draft.display_image_blob_id || draft.ocr_image_blob_id
    if (!blobId) return
    setCloudLoading(true)
    setCloudError(null)
    try {
      const blob = await getImageBlob(blobId)
      if (!blob) throw new Error('Display image blob tidak ditemukan')
      const cloudResult = await recognizeBlobCloud(blob, {
        apiKey: mistralApiKey,
        mode: cloudOcrMode,
      })
      if (!cloudResult.text || parseBerat(cloudResult.text) === null) {
        throw new Error(
          `${cloudResult.mode.toUpperCase()} tidak bisa parse angka. Raw: "${cloudResult.rawResponse.substring(0, 100)}"`,
        )
      }
      setCloudFallback(
        cloudResult.text,
        draft.ocr_raw_text || '',
        draft.ocr_confidence || 0,
        cloudResult.mode,
        cloudResult.rawResponse,
      )
    } catch (e) {
      console.error('[Review] cloud fallback failed', e)
      setCloudError(e instanceof Error ? e.message : 'Cloud OCR gagal')
    } finally {
      setCloudLoading(false)
    }
  }

  const handleConfirmCloud = (verifiedText: string, manualEdited: boolean) => {
    const berat = parseBerat(verifiedText)
    if (berat === null) return
    confirmCloudResult(berat, manualEdited)
    setEditingCloud(false)
  }

  const handleSave = async () => {
    if (!draft.qr_code_value || !draft.berat_kg) return
    if (needsCloudConfirm) return
    // Threshold gate hanya untuk local source — cloud-confirmed bypass threshold
    if (draft.ocr_source === 'local' && !meetsThreshold) return
    setSaving(true)

    const id = uuid()
    const t = {
      id,
      nomor_kode_transaksi: generateTrxCode(operator.code),
      user_operator_code: operator.code,
      user_operator_name: operator.name,
      entity_pengirim: operator.entity_pengirim,
      entity_penerima: operator.entity_penerima,
      qr_code_value: draft.qr_code_value,
      qr_image_blob_id: draft.qr_image_blob_id || '',
      display_image_blob_id: draft.display_image_blob_id || '',
      ocr_image_blob_id: draft.ocr_image_blob_id || '',
      berat_kg: draft.berat_kg,
      ocr_confidence: draft.ocr_confidence || 0,
      ocr_manual_edited: draft.ocr_manual_edited,
      ocr_raw_text: draft.ocr_raw_text,
      ocr_frame_count: draft.ocr_frame_count || 1,
      ocr_source: draft.ocr_source,
      cloud_predicted_text: draft.cloud_predicted_text,
      local_predicted_text: draft.local_predicted_text,
      local_confidence: draft.local_confidence,
      captured_at: draft.captured_at || nowISO(),
      sent_at: null,
      sync_status: 'pending' as const,
      retry_count: 0,
      last_error: null,
      device_id: getDeviceId(),
      app_version: APP_VERSION,
    }

    await saveTransaksi(t)
    if (online) syncOne(id).catch((e) => console.warn('sync failed', e))

    reset()
    navigate('/dashboard')
  }

  const handleSaveTraining = async () => {
    if (!groundTruth.trim()) return
    if (!draft.display_image_blob_id) return
    setSaving(true)
    try {
      // Copy blobs ke training-specific blob_ids supaya tidak terhapus
      // saat transaksi/draft di-reset
      const croppedId =
        (await copyBlobForTraining(draft.display_image_blob_id)) || draft.display_image_blob_id
      const fullId = draft.display_image_blob_id // sama untuk POC; bisa diperluas

      // Parse berat dari ground truth
      const berat = parseFloat(groundTruth.replace(/[^0-9.]/g, '')) || 0

      await saveTrainingSample({
        cropped_blob_id: croppedId,
        full_blob_id: fullId,
        ocr_predicted_text: draft.ocr_raw_text,
        ocr_predicted_berat: draft.berat_kg,
        ocr_confidence: draft.ocr_confidence,
        ocr_model: ocrLanguage,
        ground_truth: groundTruth.trim(),
        ground_truth_berat: berat,
        scale_brand: trainingScaleBrand || null,
        notes: notes.trim() || null,
        operator_code: operator.code,
        device_id: getDeviceId(),
        app_version: APP_VERSION,
      })
      setTrainSaved(true)
      // Auto-redirect ke dashboard setelah 1 detik
      setTimeout(() => {
        reset()
        navigate('/dashboard')
      }, 1200)
    } catch (e) {
      console.error('save training failed', e)
      setSaving(false)
    }
  }

  const handleRetake = () => {
    navigate('/capture/ocr', { replace: true })
  }

  const handleCopy = () => {
    if (draft.berat_kg !== null) navigator.clipboard?.writeText(String(draft.berat_kg))
  }

  return (
    <div className="min-h-dvh flex flex-col bg-ink-0">
      <TopBar
        title="REVIEW HASIL"
        subtitle={trainingMode ? '// MODE TRAINING' : 'STEP 03 / 03'}
      />

      <div className="grid grid-cols-3 gap-1.5 px-5 -mt-1 mb-2">
        <div className="h-1 bg-safety" />
        <div className="h-1 bg-safety" />
        <div className="h-1 bg-safety" />
      </div>

      {/* Training mode banner */}
      {trainingMode && (
        <div className="mx-5 mt-3 bg-safety/15 border border-safety/50 px-3 py-2.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-display text-sm tracking-widest text-safety">⚡ MODE TRAINING DATA</span>
          </div>
          <p className="font-mono text-[10px] text-bone-1 leading-relaxed">
            Sample ini akan disimpan ke <span className="font-bold">training dataset</span> (bukan transaksi production).
            Operator <span className="font-bold">harus input ground truth</span> di bawah untuk pasangan dengan image.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5">
        {/* CLOUD FALLBACK BANNER — saat hasil dari Mistral, butuh operator confirm */}
        {hasCloudResult && !cloudConfirmed && (
          <div className="mt-4 bg-safety/10 border-2 border-safety overflow-hidden">
            <div className="hazard-stripe h-1.5" />
            <div className="px-3 py-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-display text-sm tracking-widest text-safety">☁ CLOUD FALLBACK</span>
                <span className="font-mono text-[10px] tracking-widest bg-safety/20 px-2 py-0.5 text-safety">
                  {(cloudModeUsed || 'unknown').toUpperCase()}
                </span>
              </div>
              <p className="font-mono text-[10px] text-bone-1 leading-relaxed mb-3">
                Local OCR confidence rendah ({Math.round((draft.local_confidence || 0) * 100)}%) →
                fallback ke {cloudModeUsed === 'pixtral' ? 'Pixtral 12B' : 'mistral-ocr-latest'}.
              </p>
              {cloudRawResponse && (
                <div className="mb-3 bg-ink-0 border border-edge px-2 py-1.5">
                  <div className="font-mono text-[9px] text-bone-3 tracking-widest mb-0.5">RAW API RESPONSE</div>
                  <div className="font-mono text-[10px] text-bone-1 break-all max-h-16 overflow-y-auto">
                    {cloudRawResponse.substring(0, 300)}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-ink-1 border border-edge px-2 py-2">
                  <div className="font-mono text-[9px] text-bone-3 tracking-widest">LOCAL OCR</div>
                  <div className="font-mono text-base text-bone-2 mt-0.5 line-through">
                    "{draft.local_predicted_text || '—'}"
                  </div>
                </div>
                <div className="bg-safety/20 border border-safety px-2 py-2">
                  <div className="font-mono text-[9px] text-safety tracking-widest">CLOUD (MISTRAL)</div>
                  <div className="font-mono text-base text-bone-0 mt-0.5 font-bold">
                    "{draft.cloud_predicted_text}"
                  </div>
                </div>
              </div>

              {!editingCloud ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setCloudEditValue(draft.cloud_predicted_text || '')
                      setEditingCloud(true)
                    }}
                    className="h-11 border border-edge bg-ink-1 flex items-center justify-center gap-2 font-mono text-xs tracking-widest text-bone-1"
                  >
                    ✗ EDIT
                  </button>
                  <button
                    onClick={() => handleConfirmCloud(draft.cloud_predicted_text || '', false)}
                    className="h-11 bg-safety text-obsidian flex items-center justify-center gap-2 font-display text-sm tracking-widest"
                  >
                    ✓ BENAR
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={cloudEditValue}
                    onChange={(e) => setCloudEditValue(e.target.value)}
                    autoFocus
                    placeholder="contoh: 3.895"
                    className="w-full bg-ink-1 border-2 border-safety px-3 h-11 font-mono text-base text-bone-0 outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setEditingCloud(false)}
                      className="h-10 border border-edge bg-ink-1 font-mono text-xs tracking-widest text-bone-1"
                    >
                      BATAL
                    </button>
                    <button
                      onClick={() => handleConfirmCloud(cloudEditValue, true)}
                      disabled={!cloudEditValue.trim() || parseBerat(cloudEditValue) === null}
                      className="h-10 bg-safety text-obsidian font-display text-sm tracking-widest disabled:opacity-40"
                    >
                      ✓ SIMPAN KOREKSI
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3 bg-ink-1 border border-edge px-3 py-2">
          <IconQR className="w-4 h-4 text-safety" />
          <span className="font-mono text-[10px] text-bone-3 tracking-widest">QR</span>
          <span className="font-mono text-sm text-bone-0 truncate">{draft.qr_code_value}</span>
          <span className="ml-auto w-1.5 h-1.5 bg-ok glow-ok rounded-full" />
        </div>

        <div className="mt-3">
          <LCDDisplay value={draft.berat_kg} unit="kg" size="xl" />
        </div>

        {/* Confidence gate banner — hanya di production mode */}
        {!trainingMode && !meetsThreshold && !hasCloudResult && (
          <div className="mt-3 bg-err/10 border border-err/40 px-3 py-2.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-display text-sm tracking-widest text-err">⚠ CONFIDENCE TERLALU RENDAH</span>
            </div>
            <p className="font-mono text-[10px] text-bone-1 leading-relaxed mb-2">
              Hasil OCR tidak memenuhi minimum {Math.round(ocrThreshold * 100)}%. Aplikasi ini{' '}
              <span className="text-err font-bold">tidak menerima input manual</span> untuk integritas audit.
            </p>
            {canTriggerCloud ? (
              <button
                onClick={handleTriggerCloud}
                disabled={cloudLoading}
                className="w-full mt-1 h-11 bg-safety text-obsidian font-display text-sm tracking-widest disabled:opacity-50"
              >
                {cloudLoading ? '☁ MENGHUBUNGI MISTRAL...' : '☁ MINTA BANTUAN CLOUD OCR'}
              </button>
            ) : (
              <p className="font-mono text-[10px] text-bone-2 leading-relaxed">
                {!online && '→ Offline — silakan ULANGI capture.'}
                {online && !cloudFallbackEnabled && '→ Cloud Fallback OFF di Settings.'}
                {online && cloudFallbackEnabled && !mistralApiKey.trim() && '→ Mistral API key kosong di Settings.'}
                {online && cloudFallbackEnabled && mistralApiKey.trim() && hasCloudResult && '→ Cloud sudah dipanggil.'}
              </p>
            )}
            {cloudError && (
              <p className="font-mono text-[10px] text-err mt-2">⚠ {cloudError}</p>
            )}
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div
            className={`bg-ink-1 border p-3 ${
              trainingMode ? 'border-edge' : meetsThreshold ? 'border-edge' : 'border-err/40'
            }`}
          >
            <div className="font-mono text-[9px] text-bone-3 tracking-widest mb-1">CONFIDENCE</div>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`font-display text-2xl ${
                  trainingMode ? 'text-bone-0' : meetsThreshold ? 'text-ok' : 'text-err'
                }`}
              >
                {confPct}
              </span>
              <span className="font-mono text-xs text-bone-2">%</span>
              <span
                className={`font-mono text-[9px] ml-auto ${
                  trainingMode ? 'text-bone-3' : meetsThreshold ? 'text-ok' : 'text-err'
                }`}
              >
                {trainingMode ? 'INFO' : meetsThreshold ? 'LULUS' : 'GAGAL'}
              </span>
            </div>
            <div className="mt-2 h-1.5 bg-ink-2 relative">
              <div
                className={`absolute inset-y-0 left-0 ${
                  trainingMode ? 'bg-bone-2' : meetsThreshold ? 'bg-ok' : 'bg-err'
                }`}
                style={{ width: `${confPct}%` }}
              />
              {!trainingMode && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-bone-1"
                  style={{ left: `${ocrThreshold * 100}%` }}
                />
              )}
            </div>
            <div className="font-mono text-[9px] text-bone-3 mt-1">
              {trainingMode ? `MODEL: ${ocrLanguage.toUpperCase()}` : `MIN ${Math.round(ocrThreshold * 100)}%`}
            </div>
          </div>
          <div className="bg-ink-1 border border-edge p-3">
            <div className="font-mono text-[9px] text-bone-3 tracking-widest mb-1">EDGE AI</div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-2xl text-bone-0">ON</span>
              <span className="font-mono text-xs text-bone-2">DEVICE</span>
            </div>
            {ocrEngine === 'cnn' ? (
              <>
                <div className="font-mono text-[9px] text-safety mt-2.5 tracking-widest">CNN · ONNX</div>
                <div className="font-mono text-[9px] text-bone-3 truncate">{cnnModelPath.split('/').pop()}</div>
              </>
            ) : (
              <div className="font-mono text-[9px] text-bone-3 mt-2.5">
                TESSERACT.JS · {ocrLanguage.toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="border border-edge p-2">
            <div className="font-mono text-[9px] text-bone-3 tracking-widest mb-2">FOTO QR</div>
            <div className="bg-ink-1 h-20 flex items-center justify-center overflow-hidden">
              {qrUrl ? (
                <img src={qrUrl} alt="qr" className="w-full h-full object-cover" />
              ) : (
                <IconQR className="w-8 h-8 text-bone-3" />
              )}
            </div>
          </div>
          <div className="border border-edge p-2">
            <div className="font-mono text-[9px] text-bone-3 tracking-widest mb-2">FOTO DISPLAY</div>
            <div className="bg-ink-1 h-20 flex items-center justify-center overflow-hidden">
              {displayUrl ? (
                <img src={displayUrl} alt="display" className="w-full h-full object-cover" />
              ) : (
                <IconScale className="w-8 h-8 text-bone-3" />
              )}
            </div>
          </div>
          <div className="border border-safety/40 p-2 bg-safety/5">
            <div className="font-mono text-[9px] text-safety tracking-widest mb-2">DILIHAT OCR</div>
            <div className="bg-obsidian h-20 flex items-center justify-center overflow-hidden">
              {ocrUrl ? (
                <img src={ocrUrl} alt="ocr-view" className="w-full h-full object-contain" />
              ) : (
                <span className="font-mono text-[9px] text-bone-3">—</span>
              )}
            </div>
          </div>
        </div>

        {draft.ocr_raw_text && (
          <div className="mt-3 bg-ink-1 border border-edge px-3 py-2">
            <div className="flex items-center justify-between font-mono text-[9px] text-bone-3 tracking-widest mb-1">
              <span>RAW OCR OUTPUT</span>
              <span>
                {draft.ocr_frame_count > 1 ? `BEST OF ${draft.ocr_frame_count} FRAMES` : 'SINGLE FRAME'}
              </span>
            </div>
            <div className="font-mono text-xs text-bone-0 break-all">"{draft.ocr_raw_text}"</div>
            <div className="font-mono text-[9px] text-bone-2 mt-1">
              → parsed → <span className="text-safety">{draft.berat_kg?.toFixed(2)} kg</span>
            </div>
          </div>
        )}

        {/* Training mode: ground truth input */}
        {trainingMode && (
          <div className="mt-4 bg-safety/5 border-2 border-safety/40 p-3">
            <div className="font-mono text-[10px] text-safety tracking-[0.3em] mb-2">
              ● GROUND TRUTH INPUT
            </div>

            <label className="font-mono text-[10px] text-bone-2 tracking-widest mb-1 block">
              ANGKA YANG TERTULIS DI DISPLAY (sesuai foto)
            </label>
            <input
              type="text"
              value={groundTruth}
              onChange={(e) => setGroundTruth(e.target.value)}
              placeholder="contoh: 3.895"
              autoFocus
              className="w-full bg-ink-0 border-2 border-safety px-4 h-12 font-mono text-base text-bone-0 outline-none mb-2"
            />

            <label className="font-mono text-[10px] text-bone-2 tracking-widest mb-1 block mt-2">
              CATATAN (opsional · mis. lighting, sudut)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="—"
              className="w-full bg-ink-0 border border-edge px-3 h-9 font-mono text-xs text-bone-0 outline-none"
            />

            <div className="mt-2 flex items-center justify-between font-mono text-[9px] text-bone-2 tracking-widest">
              <span>BRAND: {trainingScaleBrand || '—'}</span>
              <span>OPERATOR: {operator.code}</span>
            </div>
          </div>
        )}

        <div className="mt-3 font-mono text-[10px] text-bone-2">
          {draft.captured_at && formatDateTimeID(draft.captured_at)} · {operator.code}
        </div>
      </div>

      <div className="px-5 py-4 border-t border-edge space-y-2">
        <button
          onClick={handleRetake}
          disabled={trainSaved}
          className="w-full h-12 border-2 border-safety bg-safety/10 flex items-center justify-center gap-2 font-display text-sm tracking-widest text-safety disabled:opacity-50"
        >
          <IconRefresh className="w-4 h-4" />
          ULANGI CAPTURE
        </button>

        {trainingMode ? (
          <>
            <button
              onClick={handleSaveTraining}
              disabled={!groundTruth.trim() || saving || trainSaved}
              className="w-full h-14 bg-safety text-obsidian flex items-center justify-center gap-2 font-display text-base tracking-wider disabled:opacity-30"
            >
              <IconCheck className="w-5 h-5" />
              {trainSaved
                ? '✓ TERSIMPAN KE DATASET'
                : saving
                ? 'MENYIMPAN...'
                : 'SIMPAN KE TRAINING DATASET'}
            </button>
            {!groundTruth.trim() && (
              <div className="text-center font-mono text-[10px] text-safety tracking-widest">
                ⚡ ISI GROUND TRUTH UNTUK SIMPAN
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCopy}
              disabled={!meetsThreshold}
              className="h-14 border border-edge bg-ink-1 flex items-center justify-center gap-2 font-display text-base tracking-wide disabled:opacity-40"
            >
              <IconCopy className="w-4 h-4 text-bone-1" />
              SALIN
            </button>
            <button
              onClick={handleSave}
              disabled={saving || needsCloudConfirm || (draft.ocr_source === 'local' && !meetsThreshold)}
              className="h-14 bg-safety text-obsidian flex items-center justify-center gap-2 font-display text-base tracking-wider disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <IconCheck className="w-5 h-5" />
              {saving ? 'MENYIMPAN...' : 'SIMPAN'}
            </button>
          </div>
        )}

        {!trainingMode && !meetsThreshold && (
          <div className="text-center font-mono text-[10px] text-err tracking-widest">
            ⚠ TOMBOL SIMPAN TERKUNCI · ULANGI DULU
          </div>
        )}
      </div>
    </div>
  )
}
