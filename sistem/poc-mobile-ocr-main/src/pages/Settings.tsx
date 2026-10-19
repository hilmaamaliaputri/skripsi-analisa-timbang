import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '@/components/TopBar'
import { BottomNav } from '@/components/BottomNav'
import { useAuth } from '@/store/auth'
import { useSettings, OCR_LANGUAGE_INFO, type OCRLanguage, type OCREngine } from '@/store/settings'
import { useNetwork } from '@/store/network'
import { syncAll } from '@/lib/sync'
import { getStorageUsage, countByStatus } from '@/lib/db'
import { getDeviceId, APP_VERSION } from '@/lib/utils'
import { IconCloudUp, IconLogout, IconRefresh, IconUpload, IconTrash } from '@/components/Icons'
import { countTrainingSamples, exportTrainingZip, downloadBlob, clearAllTrainingSamples } from '@/lib/training'

const IconCpu = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
    <rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" />
  </svg>
)

export default function Settings() {
  const navigate = useNavigate()
  const operator = useAuth((s) => s.operator)
  const logout = useAuth((s) => s.logout)
  const online = useNetwork((s) => s.online)
  const settings = useSettings()
  const [syncing, setSyncing] = useState(false)
  const [storage, setStorage] = useState({ usage: 0, quota: 0 })
  const [pending, setPending] = useState(0)
  const [trainingCount, setTrainingCount] = useState({ total: 0, byModel: {} as Record<string, number> })
  const [exporting, setExporting] = useState(false)

  const refreshTrainingCount = () => {
    countTrainingSamples().then(setTrainingCount)
  }

  useEffect(() => {
    getStorageUsage().then(setStorage)
    countByStatus().then((c) => setPending(c.pending))
    refreshTrainingCount()
  }, [])

  const handleExportTraining = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const zip = await exportTrainingZip()
      const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
      downloadBlob(zip, `analisa-training-${ts}.zip`)
    } catch (e) {
      console.error('export failed', e)
      alert('Export gagal: ' + (e instanceof Error ? e.message : 'unknown'))
    } finally {
      setExporting(false)
    }
  }

  const handleClearTraining = async () => {
    if (!confirm(`Hapus SEMUA ${trainingCount.total} training samples? Tidak bisa di-undo.`)) return
    try {
      const n = await clearAllTrainingSamples()
      alert(`✓ ${n} samples dihapus`)
      refreshTrainingCount()
    } catch (e) {
      console.error('clear failed', e)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const r = await syncAll()
      alert(`Sync selesai\n✓ ${r.succeeded} sukses\n✗ ${r.failed} gagal`)
      const c = await countByStatus()
      setPending(c.pending)
    } finally {
      setSyncing(false)
    }
  }

  const handleLogout = () => {
    if (confirm('Logout dari operator?')) {
      logout()
      navigate('/login', { replace: true })
    }
  }

  const usageMB = (storage.usage / 1024 / 1024).toFixed(1)
  const quotaMB = (storage.quota / 1024 / 1024).toFixed(0)
  const usagePct = storage.quota > 0 ? (storage.usage / storage.quota) * 100 : 0

  return (
    <div className="min-h-dvh flex flex-col bg-ink-0">
      <TopBar title="PENGATURAN" subtitle="// CONTROL" />

      <div className="flex-1 overflow-y-auto px-5 pb-2">
        {/* TRAINING DATA COLLECTION */}
        <div className="mt-4">
          <div className="font-mono text-[10px] text-bone-3 tracking-[0.3em] mb-2 flex items-center gap-2">
            <span className="text-safety">⚡</span>
            <span>TRAINING DATA COLLECTION</span>
            <div className="flex-1 h-px bg-edge" />
          </div>
          <div className="bg-safety/5 border-2 border-safety/40 overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between border-b border-safety/30">
              <div className="flex-1">
                <div className="font-display text-sm tracking-wide">MODE TRAINING</div>
                <div className="font-mono text-[10px] text-bone-3 mt-0.5">
                  Capture → input ground truth → simpan ke dataset
                </div>
              </div>
              <button
                onClick={() => settings.setTrainingMode(!settings.trainingMode)}
                className={`w-12 h-6 rounded-full p-0.5 flex items-center ${
                  settings.trainingMode ? 'bg-safety justify-end' : 'bg-bone-3 justify-start'
                }`}
              >
                <div className="w-5 h-5 bg-ink-0 rounded-full" />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-safety/30">
              <label className="font-mono text-[10px] text-bone-3 tracking-widest mb-1 block">
                MEREK / PROFIL TIMBANGAN
              </label>
              <input
                type="text"
                value={settings.trainingScaleBrand}
                onChange={(e) => settings.setTrainingScaleBrand(e.target.value)}
                placeholder="contoh: GRAM-S5i, CAS-PR-II"
                className="w-full bg-ink-0 border border-edge px-3 h-9 font-mono text-xs text-bone-0 outline-none focus:border-safety"
              />
            </div>

            <div className="px-4 py-3 grid grid-cols-3 gap-2 border-b border-safety/30 bg-ink-0">
              <div>
                <div className="font-mono text-[9px] text-bone-3 tracking-widest">TOTAL</div>
                <div className="font-display text-2xl text-safety leading-none mt-1">{trainingCount.total}</div>
              </div>
              <div>
                <div className="font-mono text-[9px] text-bone-3 tracking-widest">SSD</div>
                <div className="font-display text-2xl text-bone-0 leading-none mt-1">
                  {trainingCount.byModel.ssd || 0}
                </div>
              </div>
              <div>
                <div className="font-mono text-[9px] text-bone-3 tracking-widest">LGD</div>
                <div className="font-display text-2xl text-bone-0 leading-none mt-1">
                  {trainingCount.byModel.letsgodigital || 0}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-0">
              <button
                onClick={handleExportTraining}
                disabled={exporting || trainingCount.total === 0}
                className="h-12 bg-safety text-obsidian flex items-center justify-center gap-2 font-display text-sm tracking-widest disabled:opacity-40 disabled:bg-bone-3"
              >
                <IconUpload className="w-4 h-4" />
                {exporting ? 'EXPORTING...' : 'EXPORT ZIP'}
              </button>
              <button
                onClick={handleClearTraining}
                disabled={trainingCount.total === 0}
                className="h-12 border-l border-safety/30 bg-err/10 text-err flex items-center justify-center gap-2 font-mono text-xs tracking-widest disabled:opacity-30"
              >
                <IconTrash className="w-3.5 h-3.5" />
                HAPUS SEMUA
              </button>
            </div>
          </div>
          <p className="font-mono text-[10px] text-bone-3 mt-2 leading-relaxed">
            Aktifkan untuk kumpulkan pasangan (image, ground truth) → train custom CNN di Phase 0.
            Export ZIP berisi <span className="font-mono">labels.csv</span> + folder{' '}
            <span className="font-mono">images/</span>.
          </p>
        </div>

        <div className="mt-4 bg-ink-1 border border-edge overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-3 border-b border-edge">
            <div className="w-9 h-9 bg-pending/15 border border-pending/40 flex items-center justify-center">
              <IconCloudUp className="w-4 h-4 text-pending" />
            </div>
            <div className="flex-1">
              <div className="font-display text-sm tracking-wide">STATUS SINKRONISASI</div>
              <div className="font-mono text-[10px] text-bone-3">
                {pending} ITEM ANTRIAN · {online ? 'ONLINE' : 'OFFLINE'}
              </div>
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing || !online || pending === 0}
            className="w-full h-12 bg-safety text-obsidian flex items-center justify-center gap-2 font-display tracking-widest disabled:opacity-40"
          >
            <IconRefresh className={`w-4 h-4 ${syncing ? 'spin-slow' : ''}`} />
            {syncing ? 'SYNCING...' : 'SYNC SEKARANG'}
          </button>
        </div>

        <Section title="STORAGE">
          <Row label="USAGE">
            <span>{usageMB} / {quotaMB} MB</span>
          </Row>
          <div className="px-3 pb-3">
            <div className="h-1.5 bg-ink-2 relative">
              <div className={`absolute inset-y-0 left-0 ${usagePct > 80 ? 'bg-err' : 'bg-ok'}`} style={{ width: `${Math.min(usagePct, 100)}%` }} />
            </div>
          </div>
        </Section>

        {/* ─── CLOUD FALLBACK · MISTRAL OCR ─── */}
        <div className="mt-4">
          <div className="font-mono text-[10px] text-bone-3 tracking-[0.3em] mb-2 flex items-center gap-2">
            <span className="text-safety">☁</span>
            <span>CLOUD FALLBACK · MISTRAL OCR</span>
            <div className="flex-1 h-px bg-edge" />
          </div>
          <div className="bg-ink-1 border border-edge overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between border-b border-edge">
              <div className="flex-1">
                <div className="font-display text-sm tracking-wide">ENABLE FALLBACK</div>
                <div className="font-mono text-[10px] text-bone-3 mt-0.5">
                  Saat local OCR confidence rendah → fallback ke Mistral
                </div>
              </div>
              <button
                onClick={() => settings.setCloudFallbackEnabled(!settings.cloudFallbackEnabled)}
                className={`w-12 h-6 rounded-full p-0.5 flex items-center ${
                  settings.cloudFallbackEnabled ? 'bg-safety justify-end' : 'bg-bone-3 justify-start'
                }`}
              >
                <div className="w-5 h-5 bg-ink-0 rounded-full" />
              </button>
            </div>

            {settings.cloudFallbackEnabled && (
              <>
                <div className="px-4 py-3 border-b border-edge">
                  <label className="font-mono text-[10px] text-bone-3 tracking-widest mb-1 block">
                    MISTRAL API KEY
                  </label>
                  <input
                    type="password"
                    value={settings.mistralApiKey}
                    onChange={(e) => settings.setMistralApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-ink-0 border border-edge px-3 h-9 font-mono text-[11px] text-bone-0 outline-none"
                  />
                  <p className="font-mono text-[9px] text-bone-3 mt-1">
                    Dapat di console.mistral.ai · disimpan di browser (POC). Production sebaiknya proxy via backend.
                  </p>
                </div>
                <div className="px-4 py-3">
                  <Row label="FALLBACK TRIGGER">
                    <span className="text-safety">≤ {Math.round(settings.cloudFallbackThreshold * 100)}%</span>
                  </Row>
                  <input
                    type="range"
                    min={0.5}
                    max={0.80}
                    step={0.05}
                    value={settings.cloudFallbackThreshold}
                    onChange={(e) => settings.setCloudFallbackThreshold(parseFloat(e.target.value))}
                    className="w-full accent-safety mt-2"
                  />
                  <p className="font-mono text-[9px] text-bone-3 mt-1">
                    Trigger cloud kalau local confidence di bawah threshold ini
                  </p>
                </div>
                <div className="px-4 py-3">
                  <div className="font-mono text-[10px] text-bone-3 tracking-widest mb-2">
                    CLOUD MODEL
                  </div>
                  <div className="grid grid-cols-2 gap-0 border border-edge">
                    <button
                      onClick={() => settings.setCloudOcrMode('pixtral')}
                      className={`h-10 font-mono text-[11px] tracking-widest ${
                        settings.cloudOcrMode === 'pixtral'
                          ? 'bg-safety text-obsidian'
                          : 'bg-ink-0 text-bone-2'
                      }`}
                    >
                      PIXTRAL ★
                    </button>
                    <button
                      onClick={() => settings.setCloudOcrMode('ocr')}
                      className={`h-10 font-mono text-[11px] tracking-widest ${
                        settings.cloudOcrMode === 'ocr'
                          ? 'bg-safety text-obsidian'
                          : 'bg-ink-0 text-bone-2'
                      }`}
                    >
                      MISTRAL OCR
                    </button>
                  </div>
                  <p className="font-mono text-[9px] text-bone-3 mt-2 leading-relaxed">
                    {settings.cloudOcrMode === 'pixtral' ? (
                      <>
                        <span className="text-safety">Pixtral 12B</span> — multimodal LLM dengan prompt eksplisit. Lebih akurat untuk 7-segment LCD (preserve decimal point).
                      </>
                    ) : (
                      <>
                        <span className="text-bone-2">mistral-ocr-latest</span> — OCR engine dokumen. Cepat tapi sering hilangkan titik desimal di LCD.
                      </>
                    )}
                  </p>
                </div>
              </>
            )}
          </div>
          <p className="font-mono text-[10px] text-bone-3 mt-2 leading-relaxed">
            <span className="text-safety">💡 Hybrid Bootstrap</span> — Cloud OCR sebagai fallback +
            auto-collect (image, ground_truth) → train local CNN → eventually self-sufficient.
            Cost: $1/1000 image (Mistral).
          </p>
        </div>

        {/* OCR ENGINE TOGGLE — Hybrid mode */}
        <div className="mt-4">
          <div className="font-mono text-[10px] text-bone-3 tracking-[0.3em] mb-2 flex items-center gap-2">
            <IconCpu />
            <span>OCR ENGINE</span>
            <div className="flex-1 h-px bg-edge" />
          </div>
          <div className="bg-ink-1 border border-edge overflow-hidden">
            <div className="grid grid-cols-2 gap-0">
              {(['tesseract', 'cnn'] as OCREngine[]).map((e) => {
                const active = settings.ocrEngine === e
                const label = e === 'tesseract' ? 'TESSERACT' : 'CNN (BETA)'
                const desc = e === 'tesseract' ? 'Generic OCR · 50-70%' : 'Custom CNN · synthetic baseline'
                return (
                  <button
                    key={e}
                    onClick={() => settings.setOcrEngine(e)}
                    className={`px-3 py-3 text-left border-r border-edge last:border-r-0 ${
                      active ? 'bg-safety/15' : 'bg-ink-0'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full border-2 ${
                          active ? 'border-safety bg-safety' : 'border-bone-3'
                        }`}
                      />
                      <span className={`font-mono text-xs tracking-widest ${active ? 'text-safety' : 'text-bone-1'}`}>
                        {label}
                      </span>
                    </div>
                    <div className="font-mono text-[9px] text-bone-3 mt-1 truncate">{desc}</div>
                  </button>
                )
              })}
            </div>
            {settings.ocrEngine === 'cnn' && (
              <div className="px-3 py-2.5 border-t border-edge bg-safety/5">
                <div className="font-mono text-[10px] text-bone-3 tracking-widest mb-1">CNN MODEL FILE</div>
                <input
                  type="text"
                  value={settings.cnnModelPath}
                  onChange={(e) => settings.setCnnModelPath(e.target.value)}
                  className="w-full bg-ink-0 border border-edge px-2 h-8 font-mono text-[11px] text-bone-0 outline-none"
                />
                <p className="font-mono text-[9px] text-bone-3 mt-1">
                  Path ke .onnx file. Default: synthetic baseline (~50% accuracy untuk testing).
                  Update path saat real-data CNN ready.
                </p>
              </div>
            )}
          </div>
          <p className="font-mono text-[10px] text-bone-3 mt-2 leading-relaxed">
            <span className="text-safety">⚡ Hybrid mode</span> — switch antara Tesseract (fallback)
            atau CNN ONNX (next-gen). CNN beta saat ini 50% accuracy (synthetic data).
            Real-data training akan boost accuracy ke ≥80%.
          </p>
        </div>

        <Section title="OCR · EDGE AI">
          <Row label="CONFIDENCE THRESHOLD">
            <span className="text-safety">{Math.round(settings.ocrThreshold * 100)}%</span>
          </Row>
          <div className="px-3 pb-3">
            <input
              type="range"
              min={0.5}
              max={0.99}
              step={0.01}
              value={settings.ocrThreshold}
              onChange={(e) => settings.setOcrThreshold(parseFloat(e.target.value))}
              className="w-full accent-safety"
            />
            <p className="font-mono text-[9px] text-bone-3 mt-1">MIN UNTUK SAVE · DEFAULT 80%</p>
          </div>

          <Row label="MULTI-FRAME COUNT">
            <span className="text-safety">{settings.multiFrameCount} frame</span>
          </Row>
          <div className="px-3 pb-3">
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={settings.multiFrameCount}
              onChange={(e) => settings.setMultiFrameCount(parseInt(e.target.value, 10))}
              className="w-full accent-safety"
            />
            <p className="font-mono text-[9px] text-bone-3 mt-1">CAPTURE N FRAME · PILIH BEST CONFIDENCE</p>
          </div>

          <div className="px-3 py-2.5">
            <div className="font-mono text-[10px] text-bone-3 tracking-widest mb-2">OCR MODEL</div>
            <div className="space-y-1.5">
              {(Object.keys(OCR_LANGUAGE_INFO) as OCRLanguage[]).map((lang) => {
                const info = OCR_LANGUAGE_INFO[lang]
                const active = settings.ocrLanguage === lang
                return (
                  <button
                    key={lang}
                    onClick={() => settings.setOcrLanguage(lang)}
                    className={`w-full flex items-center gap-3 px-3 py-2 border text-left ${
                      active
                        ? 'border-safety bg-safety/10'
                        : 'border-edge bg-ink-0 hover:border-bone-3'
                    }`}
                  >
                    <div
                      className={`w-3 h-3 rounded-full border-2 ${
                        active ? 'border-safety bg-safety' : 'border-bone-3'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs text-bone-0 truncate">{info.label}</div>
                      <div className="font-mono text-[9px] text-bone-3 truncate">{info.desc}</div>
                    </div>
                    <span className="font-mono text-[9px] text-bone-3 tracking-widest">{info.size}</span>
                  </button>
                )
              })}
            </div>
            <p className="font-mono text-[9px] text-bone-3 mt-2">
              ⚡ Pilih model untuk A/B test akurasi pada display target
            </p>
          </div>
        </Section>

        <Section title="IMAGE">
          <Row label="QUALITY">
            <span className="text-safety">{Math.round(settings.imageQuality * 100)}%</span>
          </Row>
          <div className="px-3 pb-3">
            <input
              type="range"
              min={0.5}
              max={0.95}
              step={0.05}
              value={settings.imageQuality}
              onChange={(e) => settings.setImageQuality(parseFloat(e.target.value))}
              className="w-full accent-safety"
            />
          </div>
          <Row label="MAX WIDTH">
            <span>{settings.imageMaxWidth} px</span>
          </Row>
        </Section>

        <Section title="PERANGKAT">
          <Row label="DEVICE_ID">
            <span className="text-bone-1">{getDeviceId().substring(0, 13)}...</span>
          </Row>
          <Row label="OPERATOR">
            <span>{operator?.code} / {operator?.name}</span>
          </Row>
          <Row label="VERSI">
            <span>{APP_VERSION} · POC</span>
          </Row>
          <button onClick={handleLogout} className="w-full px-3 py-3 flex items-center gap-2 text-err font-mono text-xs tracking-widest border-t border-edge">
            <IconLogout className="w-3.5 h-3.5" />
            LOGOUT OPERATOR
          </button>
        </Section>

        <div className="mt-6 mb-3 text-center font-mono text-[9px] text-bone-3 tracking-widest">
          ANALISA TIMBANG · v{APP_VERSION} · POC
        </div>
      </div>

      <BottomNav />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="font-mono text-[10px] text-bone-3 tracking-[0.3em] mb-2 flex items-center gap-2">
        <IconCpu />
        <span>{title}</span>
        <div className="flex-1 h-px bg-edge" />
      </div>
      <div className="bg-ink-1 border border-edge divide-y divide-edge">{children}</div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-3 py-2.5 flex items-center justify-between">
      <span className="font-mono text-[10px] text-bone-3 tracking-widest">{label}</span>
      <span className="font-mono text-xs text-bone-0">{children}</span>
    </div>
  )
}
