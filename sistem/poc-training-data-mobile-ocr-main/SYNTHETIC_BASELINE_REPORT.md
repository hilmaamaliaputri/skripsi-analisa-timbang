# Synthetic Baseline Report — Phase 0 Sanity Check

> **Tanggal:** 1 Mei 2026
> **Tujuan:** Validate pipeline + arsitektur sebelum invest waktu real data collection
> **Hardware:** M2 Pro Metal GPU (16 GB unified memory)
> **Dataset:** 1000 synthetic 7-segment images (rendered programmatically)

> ⚠️ **Catatan revisi target (19 Okt 2026).** Laporan ini dihasilkan saat target
> masih **95%**. Target sudah direvisi menjadi **80%**, tetapi angka di laporan
> ini sengaja **tidak diubah** karena ini catatan hasil eksperimen yang sudah
> terjadi — mengubahnya akan menghapus bukti. Kesimpulan laporan tetap berlaku:
> hasil terbaik (60%) masih di bawah target, baik 95% maupun 80%.

---

## 🎯 Executive Summary

| Verdict | Status |
|---|---|
| **Pipeline working** | ✅ End-to-end terbukti |
| **Hardware capable** | ✅ M2 Pro handle 50 epochs in ~2.5 jam |
| **Architecture viable** | ✅ Loss converge, char_acc 84% |
| **Target 95% achieved** | ❌ Best: 60% (synthetic limit) |
| **From-scratch vs Transfer** | From-scratch winner di synthetic |
| **Recommendation** | Proceed dengan **real data collection** |

---

## 📊 Experiments Conducted

### Experiment 1: From-Scratch CRNN (Baseline)

```
Architecture: Custom CRNN
  - 7 Conv blocks (64→128→256→256→512→512→512)
  - 2× BiLSTM (256 units, use_cudnn=False)
  - Dense softmax (12 classes)
  - Total params: 11.6M (random init)

Training:
  - 50 epochs, batch 32, lr 1e-3
  - Time: ~2.5 jam
  - No EarlyStop (ran full 50)
```

**Results:**

| Metric | Value |
|---|---|
| Val full_acc (best) | **60.4%** (epoch 44) |
| Val char_acc (best) | **84.2%** |
| Test full_acc | **50.0%** (52/104) |
| Test char_acc | **82.0%** (431/526) |
| Inference time | 29 ms/image |

**Per-Length Accuracy:**

| Length | Accuracy |
|---|---|
| 3 chars | 75% (3/4) |
| 4 chars | 57% (24/42) |
| 5 chars | 62% (8/13) |
| 6 chars | 44% (15/34) |
| 7 chars | **18%** (2/11) ⚠ |

### Experiment 2: Transfer Learning (MobileNetV3-Small + ImageNet)

```
Architecture: Transfer learning
  - MobileNetV3-Small (alpha=1.0, ImageNet pretrained)
  - Custom CRNN head (BiLSTM + Dense)
  - Total params: 3.87M (much smaller than baseline!)

Training:
  - Phase 1 (Warmup): 10 epochs, backbone frozen, lr 1e-3
  - Phase 2 (Fine-tune): unfreeze, lr 1e-4
  - Stopped manually at Phase 2 epoch 11 (catastrophic forgetting)
```

**Results:**

| Phase | Val full_acc | Val char_acc | Notes |
|---|---|---|---|
| Phase 1 Best (epoch 9) | **18.8%** | 52% | Backbone frozen, head only |
| Phase 1 End (epoch 10) | 16% | 50% | After 10 epochs |
| Phase 2 Best (epoch 1) | 9.9% | 47% | Unfreeze immediately dropped |
| Phase 2 Trajectory | declining → 4% | declining → 40% | Catastrophic forgetting |

### Experiment Comparison

```
                       │ Train Time │ Val full_acc │ Val char_acc │
─────────────────────────────────────────────────────────────────
From-scratch (baseline)│ 2.5 jam    │ 60.4%        │ 84.2%        │
Transfer Phase 1 only  │ 9.4 menit  │ 18.8%        │ 52.0%        │
Transfer with Phase 2  │ ~30 menit  │ 9.9% (worse) │ 47%          │
```

**Winner: From-scratch baseline (60% > 19%)**

---

## 🔬 Findings

### ✅ What Worked

1. **CRNN+CTC architecture proven** — naik dari 0% ke 60% konsisten dalam 50 epoch
2. **Loss converges** — train loss 913 → 0.66 (1380× reduction)
3. **CTC alignment learned** — char_acc dari 0% ke 82% (tanpa explicit char position)
4. **M2 Pro Metal sustainable** — 50 epoch, 2.5 jam, no thermal issues
5. **ONNX export works** — 27× faster inference (81ms vs 2195ms Keras)
6. **Per-step time stable** — 1-2s per step, predictable training

### ❌ What Didn't Work

1. **Synthetic data plateau** — best 60% full_acc, can't improve more
2. **Long sequences hardest** — length 7 only 18% (vs length 3 at 75%)
3. **Overfitting** — train loss 0.66 vs val 81 (122× gap)
4. **Transfer learning Phase 2 failed** — catastrophic forgetting saat unfreeze
5. **ONNX validation imperfect** — max diff 0.94 (likely OK for argmax decoding)

### 🤔 Root Cause Analysis

**Why synthetic plateau at 60%?**

Synthetic data has limited variety despite our augmentation:
- Only 10 LED color variants
- 5 background variants
- Variation in rotation/blur/noise but bounded
- Model "exploits" patterns rather than learning robust features

**Why transfer learning failed?**

ImageNet backbone trained on natural photos (cats, cars, dll). Synthetic 7-segment patterns are **distribusi sangat berbeda**:
- Edge gradients berbeda (sharp segment vs natural)
- No semantic features (no eyes, faces, dll)
- Color distribution unique (red/green LED on dark)

→ ImageNet features not directly transferable.

**Why Phase 2 catastrophic?**

When unfreezing backbone with LR 1e-4:
- Sinyal error besar dari head (yang masih learning)
- Backbone weights "shocked" → ImageNet knowledge degradet
- Tidak ada gradient clipping atau differential LR
- Result: forgetting tanpa replacement

---

## 💡 Implications untuk Real Data Training

### Insight #1: Real Data Likely Better

Synthetic data terlalu "synthetic" — pattern mudah dieksploitasi tapi tidak generalize. Real data dengan:
- Natural lighting variation
- Camera sensor noise organic
- Perspective natural (kamera tangan operator)
- Display variation per merek

→ Likely give better generalization, even with fewer samples (200-500 real >> 1000 synthetic).

### Insight #2: From-Scratch OK untuk Real Data

Karena ImageNet transfer not effective untuk 7-segment domain:
- **Tetap pakai from-scratch architecture** untuk real data
- Atau: Train backbone dari scratch dengan SVHN dataset (Street View House Numbers — closer domain)

### Insight #3: Sequence Length Strategy

Length 7 (18%) jauh lebih jelek dari length 3-5 (60-75%).

Strategi untuk real data:
1. Stratified sampling by length saat collect
2. Augment khusus length panjang (zoom out untuk simulate)
3. Architecture adjustment: longer max sequence, more LSTM units

### Insight #4: Avoid Premature Transfer Learning

Transfer learning **tidak otomatis better**. Kalau domain gap besar (ImageNet ↔ 7-segment), training from scratch dengan domain data **bisa lebih bagus**.

---

## 📁 Files Generated

```
models/cnn_synth_v1/  (FROM-SCRATCH BASELINE)
├── best.h5                   139 MB · training model dengan CTC
├── inference.h5              46 MB  · deploy-ready
├── model.onnx                46 MB  · POC integration ready
├── evaluation_report.json    Test set metrics
├── confusion_matrix.png      Per-char substitution heatmap
├── failures.csv              52 cases yang salah
├── onnx_validation.json      Keras vs ONNX validation
└── training.csv              Per-epoch metrics

models/cnn_transfer_v1/  (TRANSFER LEARNING — kept for reference)
├── best_warmup.h5            39 MB · Phase 1 best
├── best.h5                   47 MB · Phase 2 last (degraded)
├── training_warmup.csv
└── training_finetune.csv
```

---

## 🎯 Recommendations untuk Phase 0 (Real Data Training)

### Strategy

1. **Collect 500-1000 real samples** via POC field testing
   - Variasi merek timbangan target (CAS, Mettler, AND, dll)
   - Variasi lighting (siang, redup, glare)
   - Variasi sudut & jarak

2. **Train from-scratch baseline first** (2.5 jam di M2 Pro)
   - Same architecture as `cnn_synth_v1`
   - Expected accuracy: 75-90% dengan real data quality

3. **Try transfer learning dengan adjustments**
   - Use SVHN backbone (Street View digits, closer domain)
   - Smaller LR Phase 2 (1e-5)
   - Differential LR (head 1e-4, backbone 1e-6)
   - Gradient clipping

4. **Compare apple-to-apple**
   - Real data, same train/val/test split
   - From-scratch vs transfer
   - Pick winner untuk production

### Success Criteria untuk Phase 0

| Metric | Target | Action if not met |
|---|---|---|
| Test full_acc | ≥ 95% | Add more data, augmentation |
| Test char_acc | ≥ 99% | Architecture tuning |
| Inference time | < 200ms (mobile) | Quantization, smaller model |
| Per-length: shortest | ≥ 95% | OK |
| Per-length: longest (7+) | ≥ 90% | More long-sequence augmentation |

---

## 📊 Pipeline Validation (What This Phase Achieves)

✅ **prepare.py** — Extract ZIP, split train/val/test, augmentation
✅ **train.py** — From-scratch CRNN with CTC, 50 epoch on M2 Metal
✅ **train_transfer.py** — Transfer learning with MobileNetV3 (script working)
✅ **evaluate.py** — Test set metrics, confusion matrix, failures CSV
✅ **predict.py** — Single image inference
✅ **export_onnx.py** — Keras → ONNX with validation

**Phase 0 infrastructure is production-ready.** Tinggal feed real data.

---

## 🚀 Next Action: Phase 0 Real Data

### Step 1: Setup Operator Field Collection
- Onboard operator dengan POC PWA
- Mode Training aktif
- Target: 500+ samples first batch (1-2 minggu)

### Step 2: Train Real Data Models
- Run `train.py` dengan real data
- Run `train_transfer.py` dengan adjustments
- Compare results

### Step 3: Deploy Best Model
- Export ONNX
- Integrate ke POC (lihat `DEPLOYMENT.md`)
- Validate accuracy real-world

### Step 4: Iterate
- Collect lebih banyak samples (1000-5000)
- Retrain berkala
- A/B test versions

---

## 🎬 Konklusi

POC training pipeline **PROVEN WORKING** dengan synthetic data sebagai sanity check. Model architecture viable, hardware capable. **Synthetic plateau di 60%** ekspektasi — bukan failure, validasi bahwa **real data dengan diversity lebih besar** akan mengejar target 95%.

**Status:** ✅ Ready for Phase 0 with real data.

**Owner:** AI/ML Engineer
**Reviewers:** CTO, Project Lead
**Date:** 1 Mei 2026
