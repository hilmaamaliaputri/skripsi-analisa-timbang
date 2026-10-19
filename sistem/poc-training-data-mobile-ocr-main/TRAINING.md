# Training Guide — Step by Step

> **Audience:** AI/ML Engineer atau developer yang akan train custom CNN untuk POC ANALISA TIMBANG.
>
> **Prerequisite:** Dataset ZIP dari POC field collection (`analisa-training-YYYY-MM-DD.zip`) dengan minimum **500 samples** (rekomendasi 1000+).

---

## Setup Awal (Sekali Saja)

### Apple Silicon (M1/M2/M3) — Untuk Iteration Cepat

```bash
cd training/
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install tensorflow-metal  # GPU acceleration via Metal
```

**Verify GPU detected:**
```bash
python -c "import tensorflow as tf; print('GPU:', tf.config.list_physical_devices('GPU'))"
# Expected: [PhysicalDevice(name='/physical_device:GPU:0', device_type='GPU')]
```

### Linux (NVIDIA GPU)

```bash
cd training/
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# CUDA support otomatis via tensorflow standard
```

### Google Colab (Final Training — Recommended)

1. Buka [`notebooks/train_colab.ipynb`](./notebooks/train_colab.ipynb) di colab.research.google.com
2. **Runtime → Change runtime type → T4 GPU**
3. Run all cells

---

## Workflow Training Lengkap

### 1. Collect Data dari POC Field Testing

Sebelum mulai training, butuh data minimum 500 samples (idealnya 1000-2000):

```
Operator di lapangan:
  POC PWA → Settings → MODE TRAINING ON
  Capture display timbangan + input ground truth
  Repeat 500-1000× dengan variasi merek, lighting, jarak, sudut
  Settings → EXPORT ZIP → analisa-training-YYYY-MM-DD.zip
```

Detail lengkap tentang cara collect: lihat [`../poc/SPEC.md` §11 OCR Training](../poc/SPEC.md).

**Tips kualitas dataset:**
- Variasi 5-10 merek timbangan (kalau punya akses)
- Variasi pencahayaan: terang siang · redup gudang · glare
- Variasi sudut: 0°, ±10°, ±20°
- Variasi jarak: 15-50 cm
- **Minimum 50 sample per digit length** (3-7 digit) untuk stratified split

### 2. Letakkan ZIP di `data/`

```bash
mv ~/Downloads/analisa-training-2026-05-15.zip training/data/
```

### 3. Prepare Dataset

```bash
python prepare.py --input data/analisa-training-2026-05-15.zip --clean
```

**Apa yang terjadi:**
- Extract ZIP
- Validate samples (filter yang corrupt/empty)
- Stratified split 80/10/10 (train/val/test) by digit length
- Augmentation 5× untuk train set (rotate ±8°, brightness ±20%, blur, noise)
- Output: `data/prepared/{train,val,test}/`

**Output expected:**
```
[STATS] Total: 1000
  By length: {3: 50, 4: 250, 5: 350, 6: 250, 7: 100}
  By char: {'.': 750, '0': 380, '1': 420, ...}

[SPLIT]
  Train: 800 (80%)
  Val:   100 (10%)
  Test:  100 (10%)

[AUGMENT] 4 augmented variants per training sample
[SAVE] data/prepared/train  → 4000 rows (800 + 3200 augmented)
[SAVE] data/prepared/val    → 100 rows
[SAVE] data/prepared/test   → 100 rows
```

**Flag opsional:**
- `--no-augment` — skip augmentation (untuk debug)
- `--clean` — hapus existing prepared folder dulu
- `--output PATH` — custom output folder

### 4. Train Model

#### Default training (50 epochs, batch 32, lr 1e-3)

```bash
python train.py --output models/cnn_v1/
```

Adjust sesuai dataset size:
| Dataset Size | Recommended Args |
|---|---|
| < 500 samples | `--epochs 30 --batch 16 --lr 5e-4` |
| 500-2000 | `--epochs 50 --batch 32 --lr 1e-3` (default) |
| 2000-5000 | `--epochs 60 --batch 64 --lr 1e-3` |
| > 5000 | `--epochs 80 --batch 128 --lr 2e-3` |

#### Monitor di Terminal

```
[BUILD] Training model
  Inference params: 11,598,093
  Total training params: 11,598,093

[TRAIN] 50 epochs · batch 32 · lr 0.001
Epoch 1/50
12/12 [====] - 18s 1.5s/step - loss: 12.4 - val_loss: 8.9 - val_full_acc: 0.0234

Epoch 2/50
12/12 [====] - 8s 700ms/step - loss: 7.2 - val_loss: 5.1 - val_full_acc: 0.1842

...

Epoch 38/50
12/12 [====] - 7s 600ms/step - loss: 0.18 - val_loss: 0.31 - val_full_acc: 0.9650 ✓

Epoch 38: val_full_acc improved from 0.94 to 0.965, saving model

...
```

**Parameter penting:**
- `val_full_acc` ≥ 0.80 → target tercapai
- `val_char_acc` ≥ 0.99 → digit-level akurat
- `loss` decreasing → model belajar
- Patience early stopping: 10 epochs

#### Outputs

`models/cnn_v1/` setelah training:
```
best.h5                  Training model dengan CTC layer (best val acc)
inference.h5             Inference-only (single input, no CTC) — UNTUK ONNX EXPORT
final.h5                 Final epoch
training.csv             Per-epoch metrics
history.json             Lossses & accuracies
training_curves.png      Visualization
```

### 5. Evaluate on Test Set

```bash
python evaluate.py --model models/cnn_v1/best.h5 --data data/prepared/test/
```

**Output:**
```
[RESULTS]
  Full-string accuracy: 0.9580 (96/100)
  Char-level accuracy:  0.9924
  Avg edit distance:    0.06
  Inference time:       145.2 ms/image (CPU)

  Target 80% full-string: ✅ MET

[BY LENGTH]
  Length 3:    5/  5 (100.0%)
  Length 4:   25/ 25 (100.0%)
  Length 5:   33/ 35 ( 94.3%)
  Length 6:   24/ 25 ( 96.0%)
  Length 7:    9/ 10 ( 90.0%)

[FAILURES] 4 cases saved → models/cnn_v1/failures.csv
[CONFUSION] Saved → models/cnn_v1/confusion_matrix.png
[REPORT] Saved → models/cnn_v1/evaluation_report.json
```

**Files generated:**
- `failures.csv` — daftar test case yang salah baca (untuk analyze)
- `confusion_matrix.png` — per-character substitution heatmap
- `evaluation_report.json` — semua metrics dalam JSON

### 6. Test Single Image

```bash
python predict.py --model models/cnn_v1/best.h5 --image samples/test01.jpg
```

**Output:**
```
  Predicted:        "3.895"
  Confidence:       0.945 (94.5%)
  Inference time:   142.3 ms
  Char count:       5
```

### 7. Export ke ONNX

```bash
python export_onnx.py --model models/cnn_v1/inference.h5 --output models/cnn_v1/model.onnx
```

**Output:**
```
[LOAD] models/cnn_v1/inference.h5
  Source model loaded · 11,598,093 params

[REBUILD] Inference model dengan LSTM unrolled (ONNX-friendly)
  Copied weights for 18 layers

[EXPORT] → models/cnn_v1/model.onnx
  ONNX file: models/cnn_v1/model.onnx (45000 KB)

[VALIDATE] Keras vs ONNX
  Max diff: 1.234e-06
  Mean diff: 5.67e-07
  Keras inference: 145.2 ms
  ONNX inference:  32.4 ms
  Validation: ✅ PASS
```

**Untuk deploy ke POC**, lihat [`DEPLOYMENT.md`](./DEPLOYMENT.md).

---

## Iteration Strategy

### Kalau val_full_acc < 80%

**Diagnose:** Lihat `evaluation_report.json` + `confusion_matrix.png` + `failures.csv`.

| Symptom | Diagnosis | Action |
|---|---|---|
| Train acc tinggi, val rendah | **Overfitting** | Increase dropout, augmentation, more data |
| Train acc rendah | **Underfitting** | Train lebih lama, model bigger, lr adjust |
| Specific digit selalu salah (e.g., 8↔3) | **Class imbalance** | Collect lebih banyak sample digit tersebut |
| Specific brand fail | **Domain shift** | Train per-brand model, atau add lebih banyak sample |
| Decimal point hilang | **Annotation issue** | Verify ground truth quality |
| Length 7 lebih jelek | **Long sequence struggle** | Increase MAX_LABEL_LENGTH, lebih banyak data length 7 |

### Tuning Hyperparameters

`config.py` — adjust sesuai eksperimen:

```python
# Image
IMG_HEIGHT = 64           # naikkan ke 96 jika digit kecil tidak terbaca
IMG_WIDTH = 256           # naikkan ke 320 untuk display panjang

# Training
BATCH_SIZE = 32           # 16 jika OOM, 64 jika dataset besar
EPOCHS = 50
LEARNING_RATE = 1e-3      # 5e-4 untuk fine-tune dari pretrained
PATIENCE = 10

# Architecture
LSTM_UNITS = 256          # 128 untuk model kecil, 384 untuk kompleks
DROPOUT = 0.25            # 0.4 jika overfit

# Augmentation
AUG_ROTATION_DEG = 8      # 12 jika data sudut bervariasi
AUG_BRIGHTNESS_PCT = 0.2  # 0.3 jika lighting sangat varied
AUG_BLUR_KERNEL_MAX = 3
AUG_NOISE_STD = 0.03
AUG_SAMPLES_PER_ORIGINAL = 4  # 8 jika dataset kecil
```

### Multi-Run Eksperimen

Save model versions untuk comparison:

```bash
python train.py --output models/cnn_v1_baseline/
# adjust config.py
python train.py --output models/cnn_v2_more_dropout/
# adjust again
python train.py --output models/cnn_v3_bigger_lstm/

# Compare
for v in v1_baseline v2_more_dropout v3_bigger_lstm; do
    echo "=== $v ==="
    cat models/cnn_$v/evaluation_report.json | grep accuracy
done
```

---

## Troubleshooting

### Setup Issues

| Error | Solution |
|---|---|
| `tensorflow-metal not found` | macOS only: `pip install tensorflow-metal` |
| GPU not detected on M-series | Reinstall: `pip install --force-reinstall tensorflow tensorflow-metal` |
| `Could not find CUDA` (Linux) | Install CUDA 11.8+ matching tensorflow version |
| Python version mismatch | Use Python 3.10-3.11 (3.12+ may have compat issues) |

### Training Issues

| Error | Solution |
|---|---|
| `Out of data` | Already fixed — using numpy arrays, not tf.data generator |
| `OOM (Out of Memory)` | Reduce `BATCH_SIZE` di config.py |
| Loss = NaN | Lower learning rate, check label format (no garbage chars) |
| Training too slow | Use Colab T4 GPU instead of CPU |
| `val_full_acc` stuck at 0 | Need more data or epochs (CTC takes time to learn alignment) |

### Export Issues

| Error | Solution |
|---|---|
| `CudnnRNNV3 not supported` | Already handled — `export_onnx.py` rebuilds with unrolled LSTM |
| `tf2onnx version mismatch` | `pip install 'tf2onnx<1.18' 'onnx<1.18'` |
| ONNX validation fails | Acceptable jika untuk untrained model. Trained model harus pass. |

---

## Best Practices

### Data Quality > Quantity

100 well-labeled diverse samples > 1000 noisy similar samples. Pastikan:
- Ground truth **persis** sama dengan yang tertulis di display
- Image fokus & jelas (bukan motion blur extreme)
- Variasi cukup di semua dimensi (brand, lighting, angle)

### Versioning

Setiap kali train, save dengan versi naming yang descriptive:
```
models/
├── cnn_v1_baseline_500samples/
├── cnn_v2_v1+more_data_1500samples/
├── cnn_v3_per_brand_CAS/
└── cnn_v3_per_brand_GRAM/
```

### A/B Testing di POC

Setelah deploy v2, jalankan **paralel** dengan v1 di POC:
- 50% operator pakai v1 (baseline)
- 50% pakai v2 (kandidat baru)
- Compare production accuracy 1-2 minggu sebelum promote v2

Lihat [`DEPLOYMENT.md`](./DEPLOYMENT.md) untuk detail.

### Continuous Improvement Loop

```
Production deployment
     ↓
Operator gets confidence < 80% sometimes
     ↓
Low-confidence images auto-flagged
     ↓
Periodic retrain dengan tambahan data baru
     ↓
A/B test → promote → repeat
```

---

## Tips Khusus M2 Pro

Berdasarkan smoke test pada M2 Pro 16GB:

- **Step time:** ~700ms per batch (16) — sustainable for 50 epochs
- **Memory:** Fits 16GB easily for our model + 5000 samples in memory
- **Thermal:** Sustained training 1+ jam = thermal throttling muncul. Tutup app berat (Chrome, video).
- **Tip:** Plug in power adapter — battery mode otomatis throttle GPU.

Untuk monitor:
```bash
sudo powermetrics --samplers gpu_power -i 1000 -n 5
```

---

## Smoke Test (Tanpa Real Data)

Untuk validate pipeline tanpa nunggu data real:

```bash
# Generate 50 synthetic 7-segment images
python generate_synthetic.py --count 50

# Quick pipeline test
python prepare.py --input data/synthetic.zip --clean
python train.py --output models/smoke_test/ --epochs 3 --batch 16
python evaluate.py --model models/smoke_test/best.h5 --data data/prepared/test/
python export_onnx.py --model models/smoke_test/inference.h5 --output models/smoke_test/model.onnx
```

⚠ Synthetic data **tidak** representatif untuk akurasi production. Hanya untuk validate scripts work end-to-end.

---

## Next: Deploy Model ke POC

Setelah ONNX file siap (≥80% accuracy on test set), lanjut ke [`DEPLOYMENT.md`](./DEPLOYMENT.md).
