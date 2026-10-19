# 07 — Keterbatasan, Tech Debt, Keamanan & Validitas

## 7a. TODO / FIXME / HACK

| Lokasi | Isi | Catatan |
|---|---|---|
| `poc-mobile-ocr-main/README.md:L126` | "⚠ TODO: tambah 192.png, 512.png, maskable-512.png" | **Sudah basi**: ikon sudah ada di `public/icons/` (dibuat `scripts/generate_icons.py`) |
| `poc-mobile-ocr-main/README.md:L177-195` | "TODO Sebelum Demo": ikon, `msw init`, HTTPS, eng.traineddata, QR sampel | `msw init` tidak lagi relevan (MSW tidak di-start) |
| `SPEC.md:L611-625,L714-722` | Checklist deliverable & closeout **belum dicentang** (test-results.md, screenshots, lessons-learned, compatibility.md, video demo) | dokumen hasil uji belum dibuat |
| Kode sumber (`.ts/.tsx/.js/.py`) | **Tidak ada** penanda TODO/FIXME/HACK | [KODE] grep |

## 7b. Keterbatasan teknis & tech debt (bahan "batasan masalah" & "saran")

### Akurasi & ML
| # | Temuan | Bukti | Label | Saran |
|---|---|---|---|---|
| T-01 | Akurasi belum mencapai target 80%: CNN sintetis test 50,0%; ML Kit 4/7; Tesseract 0/12 exact | `SYNTHETIC_BASELINE_REPORT.md:L46`, `poc-ocr-timbangan-master/README.md:L21`, `SPEC.md:L807` | [KODE] dok. | Data nyata + E1–E4 (lihat 06) |
| T-02 | **Tidak ada data nyata** untuk melatih CNN | tidak ada ZIP ekspor di repo | [KODE] | Kampanye pengumpulan via Mode Training |
| T-03 | Reshape CNN→RNN **tanpa Permute** → sekuens CTC mengikuti sumbu tinggi, bukan lebar | `train.py:L109-111`, `export_onnx.py:L48-50`, `train_transfer.py:L107-109` | [KODE] (dampak [INFERENSI]) | `Permute((2,1,3))` sebelum Reshape; uji ablation |
| T-04 | Preprocessing train ≠ inference (crop vs squash, interpolasi, domain ROI) | `train.py:L55-69` vs `ocr-cnn.ts:L64-68` | [KODE] | Satu spesifikasi preprocessing + uji paritas numerik |
| T-05 | Validasi ONNX gagal (max diff 0,94 vs ambang 1e-4) namun model tetap dipakai | `SYNTHETIC_BASELINE_REPORT.md:L114`, `export_onnx.py:L172` | [KODE] dok. | Investigasi (unroll, BN, dropout) sebelum deploy |
| T-06 | Model FP32 46,6 MB tanpa kuantisasi; precache pertama besar (+11 MB ssd) | `ls`, `vite.config.ts:L29-30` | [INFERENSI kuat] | Kuantisasi INT8/FP16 (onnxruntime quantization), model lebih ramping |
| T-07 | Confidence tidak terkalibrasi, tetapi dipakai sebagai gate 80%; confidence cloud konstanta 0,80 | `ocr-cnn.ts:L126-128`, `ocr-cloud.ts:L191`, `SPEC.md:L809` | [KODE] | Kalibrasi (temperature scaling), evaluasi selective accuracy |
| T-08 | Kelas output 13 (dokumen: 12); indeks 11 tidak terpakai | `train.py:L126` vs `README.md:L48` | [KODE] | Samakan: `Dense(len(VOCAB)+1)` |
| T-09 | Greedy decoding tanpa aturan format/rentang | `ocr-cnn.ts:L92-131`, `ocr.ts:L138-144` | [KODE] | Beam search + validasi format per profil timbangan |
| T-10 | Pipeline RN di-tuning pada 7 citra uji yang sama | `docs/ANALYSIS_PER_FILE.md`, `r35-tuned-trim.js:L311-333` | [INFERENSI] | Set uji terpisah; jangan klaim 57,1% sebagai generalisasi |
| T-11 | Metrik char accuracy posisional (bias) & tidak ada CER | `evaluate.py:L106-112` | [KODE] | Tambah CER berbasis Levenshtein |
| T-12 | "Multi-frame voting" sebenarnya max-confidence | `CaptureOCR.tsx:L159-161` | [KODE] | Coba majority vote/konsensus antarframe |

### Aplikasi PWA
| # | Temuan | Bukti | Label |
|---|---|---|---|
| T-13 | `parseBerat` membulatkan ke 2 desimal → "3.895" tersimpan 3,9 | `lib/ocr.ts:L143` | [KODE] (nilai [INFERENSI] IEEE-754) |
| T-14 | Berat 0 kg tidak bisa disimpan/ditinjau (`!draft.berat_kg` bernilai true untuk 0) | `Review.tsx:L46,L126` | [KODE] |
| T-15 | Thumbnail "DILIHAT OCR" bukan input model sebenarnya | `CaptureOCR.tsx:L167-173`, `types/ocr.ts:L29` | [KODE] |
| T-16 | `training_samples.ocr_model` diisi bahasa Tesseract meski engine CNN; `full_blob_id` bukan foto utuh | `Review.tsx:L178,L189` | [KODE] |
| T-17 | Tidak ada auto-sync saat kembali online; tidak ada Background Sync; tanpa backoff/limit retry | `store/network.ts:L14-17`, `sync.ts:L37-45` | [KODE] |
| T-18 | Record bisa tertahan di status `syncing` (tidak ikut query pending) | `sync.ts:L15`, `db.ts:L40` | [INFERENSI] |
| T-19 | Foto bukti & field audit cloud **tidak** dikirim ke server | `sync.ts:L18-30` | [KODE] |
| T-20 | Blob yatim tiap retake; tidak ada retensi/cleanup data tersinkron | `CaptureOCR.tsx:L163-173`; grep `deleteImageBlob` | [INFERENSI] |
| T-21 | Backend belum ada; MSW handler tidak dipakai (dokumen menyatakan sebaliknya) | `lib/api.ts:L9-12`, `main.tsx:L1-14`, `README.md:L130,L201-203` | [KODE] |
| T-22 | Setting `imageQuality`/`imageMaxWidth` ditampilkan tetapi tidak dipakai | grep: hanya `Settings.tsx:L449-463` | [KODE] |
| T-23 | `entity_penerima` hardcoded; multi-entity belum ada | `Login.tsx:L26`, `SPEC.md:L77` | [KODE] |
| T-24 | Kode tak terpakai: `recognizeBlobRaw`, `terminateOCR`, `api.ping`, `pingMistral`, runner `r37` tidak ada di menu | `ocr.ts:L120,L146`, `api.ts:L63`, `ocr-cloud.ts:L202`, `runners.js:L16` vs `models.js` | [KODE] |
| T-25 | Tidak ada test otomatis sama sekali | lihat 06a | [KODE] |
| T-26 | Draft tidak persist → refresh di tengah wizard = kehilangan data | `store/capture.ts:L31` (tanpa `persist`) | [KODE] |
| T-27 | Tidak ada GPS walau slide menyebut "waktu + GPS" | slide 5 vs grep `geolocation` nihil | [KODE] |
| T-28 | Dokumen menyebut Google Vision untuk hybrid; kode memakai Mistral | slide 14–15 vs `ocr-cloud.ts:L22-25` | [KODE] |

### Batasan masalah yang bisa diturunkan (usulan)
1. Objek: display digital 7-segmen timbangan (LED/LCD) dengan karakter **0–9 dan titik desimal** saja (tanpa tanda minus, satuan, huruf) — sesuai `VOCAB` (`config.py:L18`).
2. Maksimum 8 karakter per pembacaan (`config.py:L21`).
3. Satu baris angka dalam ROI tetap (PSM 7, ROI 70%×35%).
4. Platform: browser mobile (Chrome Android sebagai target utama; iOS Safari opsional) dengan HTTPS.
5. Backend disimulasikan (mock); fokus pada sisi klien & model.
6. Evaluasi pada merek/tipe timbangan tertentu yang tersedia di lokasi penelitian [KONFIRMASI].

## 7c. Keamanan & privasi

| # | Aspek | Temuan | Bukti | Label |
|---|---|---|---|---|
| S-01 | Autentikasi | Kredensial demo hardcoded di bundle klien (`password: 'demo'`) dan diisi otomatis di form | `mocks/data.ts:L4`, `Login.tsx:L11-12` | [KODE] |
| S-02 | Token | Token mock `mock-jwt-poc-<ts>`, tanpa kedaluwarsa/validasi; guard hanya cek keberadaan token | `api.ts:L34`, `routes.tsx:L14-15` | [KODE] |
| S-03 | Penyimpanan sesi | Token & profil di localStorage (rentan XSS) | `store/auth.ts:L26-28` | [KODE] |
| S-04 | API key pihak ketiga | Mistral API key disimpan **plaintext di localStorage** dan dikirim langsung dari browser; kode sendiri menyatakan tidak ideal untuk produksi | `store/settings.ts:L69`, `ocr-cloud.ts:L12-13`, `Settings.tsx:L243-251` | [KODE] |
| S-05 | Kebocoran data ke pihak ketiga | Foto display dikirim ke Mistral (base64) saat fallback aktif — bertentangan dengan constraint "cloud AI dilarang" | `ocr-cloud.ts:L165-182`, `SPEC.md:L774` | [KODE] |
| S-06 | Integritas ("no manual input") | Jalur koreksi cloud memungkinkan operator **mengetik angka berat** (ditandai `ocr_manual_edited`) — bertentangan dengan aturan stakeholder | `Review.tsx:L303-326`, `SPEC.md:L773` | [KODE] |
| S-07 | Data di perangkat | Transaksi, foto, identitas operator, `device_id` tersimpan tanpa enkripsi; **logout tidak menghapus** IndexedDB/Cache → operator berikutnya di HP yang sama dapat melihat riwayat | `Settings.tsx:L80-85`, `store/auth.ts:L24` | [KODE] |
| S-08 | Transport | Tidak ada header auth pada request sync; HTTPS bergantung hosting | `api.ts:L17-21` | [KODE] |
| S-09 | Build produksi | `sourcemap: true` → kode sumber terekspos di produksi | `vite.config.ts:L78` | [KODE] |
| S-10 | Dev server | `host: true`, `allowedHosts: true` (hanya dev) | `vite.config.ts:L71-75` | [KODE] |
| S-11 | Regulasi | Data identitas operator & foto lokasi kerja = data pribadi → relevan dengan UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (perlu dikaji untuk fitur cloud) | — | [INFERENSI] |

## 7d. Risiko validitas penelitian

| # | Risiko | Penjelasan & bukti | Mitigasi |
|---|---|---|---|
| V-01 | **Domain gap sintetis → nyata** | Model hanya dilatih data render OpenCV (10 warna LED, 9 latar) (`generate_synthetic.py:L83-110`); laporan sendiri menyebut plateau (`SYNTHETIC_BASELINE_REPORT.md:L118-124`) | Latih & uji pada data nyata; laporkan sintetis hanya sebagai baseline |
| V-02 | **Ukuran sampel uji sangat kecil** | 2 citra (Tesseract), 7 citra (ML Kit), 104 sintetis | Target ≥ 50–100 citra nyata per kondisi; laporkan CI 95% |
| V-03 | **Tuning pada data uji** | Pipeline RN disetel pada 7 fixture yang juga menjadi penilaian | Pisahkan dev set vs test set |
| V-04 | **Kebocoran data antarsplit** | Multi-frame & retake menghasilkan citra hampir identik; split acak per sampel (`prepare.py:L141-145`) dapat membocorkan | Split per sesi/timbangan (group split) |
| V-05 | **Bias anotasi (anchoring)** | Input ground truth **diisi otomatis dengan hasil OCR** (`Review.tsx:L59-60`) → operator cenderung menerima prediksi salah | Kosongkan field atau verifikasi ganda |
| V-06 | **Label noise** | Ground truth diketik bebas, hanya dicek "mengandung digit" (`prepare.py:L110-113`) | Validasi regex + review kedua |
| V-07 | **Distribusi label tidak realistis** | Sintetis 1–9999 integer, desimal acak (`generate_synthetic.py:L218-234`) vs rentang timbangan nyata | Samakan distribusi dengan kapasitas timbangan target |
| V-08 | **Confidence ≠ akurasi** | Gate 80% confidence tidak otomatis = akurasi 80% | Eksperimen E4 |
| V-09 | **Lingkungan uji tidak representatif** | ML Kit diuji di emulator AVD x86_64 (`README.md:L21`), latensi ONNX di desktop | Uji di HP fisik kelas menengah |
| V-10 | **Angka tidak dapat diverifikasi ulang** | Artefak hasil (json/csv) tidak ada di repo | Simpan artefak + versi model + seed di lampiran |
| V-11 | **Inkonsistensi dokumen** | Slide 8 (Tesseract 50–65%) vs SPEC (0/12); TRAINING.md 95,8% contoh | Kutip hanya data primer terverifikasi |
| V-12 | **Lisensi & asal data** | Sumber 7 fixture dan citra Kaggle belum dicatat lisensinya | [KONFIRMASI] sumber & izin penggunaan |
