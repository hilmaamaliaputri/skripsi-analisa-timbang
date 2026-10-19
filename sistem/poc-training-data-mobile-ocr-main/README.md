# Training Pipeline — ANALISA TIMBANG Custom CNN

> **Phase 0** — Train custom OCR model untuk 7-segment timbangan industrial.
> Output: `model.onnx` siap deploy ke POC PWA via `onnxruntime-web`.

---

## TL;DR

```bash
# Sekali setup
cd training/
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt && pip install tensorflow-metal  # M-series

# Workflow tiap dataset baru
python prepare.py --input data/analisa-training-XXX.zip --clean
python train.py --epochs 50
python evaluate.py --model models/cnn_v1/best.h5 --data data/prepared/test/
python export_onnx.py --model models/cnn_v1/inference.h5 --output models/cnn_v1/model.onnx
cp models/cnn_v1/model.onnx ../poc/public/models/cnn_v1.onnx
```

---

## Why Custom CNN

POC validation (`../poc/SPEC.md` §VALIDATION REPORT) membuktikan generic Tesseract tidak mencapai 95% threshold pada display 7-segment industrial. **Custom CNN** trained pada data domain-specific = jalan satu-satunya.

**Target:** ≥80% full-string accuracy pada test set.

---

## Architecture

**CRNN + CTC** — standard untuk variable-length OCR. Handle "9562" dan "3.895" dengan model yang sama.

```
Input image (64×256×1 grayscale)
        ↓
   7 Conv blocks (64→128→256→256→512→512→512)
   strategic MaxPool downsampling
        ↓
   Reshape (T, features)
        ↓
   2× BiLSTM (256 units)
        ↓
   Dense softmax (12 classes: 0-9 + . + CTC blank)
        ↓
   CTC loss (handle alignment otomatis saat training)
        ↓
   Output: "3.895" or "9562"
```

**Vocabulary:** `0-9` + `.` = 11 chars + 1 CTC blank = 12 classes
**Total params:** ~11.6M
**Model size (ONNX):** ~45 MB (uncompressed)

---

## Dokumentasi Lengkap

| File | Untuk |
|---|---|
| **`README.md`** (file ini) | Overview, architecture, quick reference |
| **[`TRAINING.md`](./TRAINING.md)** | Step-by-step training detail · troubleshooting |
| **[`DEPLOYMENT.md`](./DEPLOYMENT.md)** | Deploy model ke POC PWA · ONNX integration code |

---

## Folder Structure

```
training/
├── README.md             (this file)
├── TRAINING.md           (detailed training guide)
├── DEPLOYMENT.md         (deploy ke POC)
├── requirements.txt      (Python deps)
├── config.py             (hyperparameters)
├── prepare.py            (extract ZIP → augment → split)
├── train.py              (CRNN + CTC training)
├── evaluate.py           (test set metrics)
├── predict.py            (single image inference)
├── export_onnx.py        (Keras → ONNX)
├── generate_synthetic.py (smoke test data — dev only)
├── notebooks/
│   └── train_colab.ipynb (Colab end-to-end)
├── data/                 (gitignored)
│   ├── *.zip             (raw exports dari POC)
│   └── prepared/         (after prepare.py)
└── models/               (gitignored)
    └── cnn_v1/
        ├── best.h5             (training model dengan CTC)
        ├── inference.h5        (deploy-ready, no CTC)
        ├── model.onnx          (untuk POC PWA)
        ├── evaluation_report.json
        ├── confusion_matrix.png
        └── training_curves.png
```

---

## Hardware Comparison

| Hardware | 1000 samples · 50 epochs | Cost |
|---|---|---|
| **M2 (CPU)** | ~6-10 jam | Gratis |
| **M2 (Metal GPU)** | **~1.5-3 jam** | Gratis |
| **M2 Pro/Max (Metal)** | ~45-90 menit | Gratis |
| **Colab T4 (Free)** | ~30-60 menit | Gratis |
| **Colab A100 (Pro)** | ~10-15 menit | $10/bulan |

**Recommendation:**
- Iterate di M2 + Metal (fast feedback)
- Final production training di Colab T4 (most reliable)

---

## Performance Targets

| Metric | Target | Notes |
|---|---|---|
| Full-string accuracy | **≥ 80%** | Hard requirement (no manual input rule) |
| Char-level accuracy | ≥ 99% | Per-digit correct |
| Inference time | < 200ms | Per image di smartphone via ONNX Web |
| Model size | ~45 MB | Acceptable untuk PWA precache |
| Training time | 30-90 menit | Di T4 GPU dengan 1000 samples |

---

## Quick Status Check

| Component | Status | Verified |
|---|---|---|
| Pipeline `prepare.py` | ✅ | Smoke test 50 samples |
| Pipeline `train.py` | ✅ | M2 Pro Metal GPU, 78s/3 epochs |
| Pipeline `evaluate.py` | ✅ | Per-length stats, confusion matrix |
| Pipeline `predict.py` | ✅ | Single image inference |
| Pipeline `export_onnx.py` | ✅ | 45 MB ONNX, 30ms inference |
| ONNX runtime compatibility | ✅ | Loads & runs in onnxruntime-web |
| **Real data accuracy** | ⏸ | Tunggu data dari POC field collection |

---

## Lihat Juga

- 📄 [TRAINING.md](./TRAINING.md) — Detail step-by-step training
- 📄 [DEPLOYMENT.md](./DEPLOYMENT.md) — Deploy model ke POC PWA
- 📁 [`../poc/SPEC.md`](../poc/SPEC.md) — POC validation report (Risk R1 confirmed)
- 📁 [`../planning/Feature_List_ANALISA_TIMBANG.xlsx`](../planning/Feature_List_ANALISA_TIMBANG.xlsx) — Phase 0 budget & timeline

---

**Owner:** AI/ML Engineer (Phase 0)
**Version:** 0.2 (post-smoke-test)
**Last Updated:** 1 Mei 2026
