# ANALISA TIMBANG · SYNTHETIC DATASET

Generated: 2026-05-01T14:04:58.873465
Count: 1000 samples
Seed: 100

## Purpose
Smoke testing pipeline saja — bukan untuk production training.
Validate bahwa prepare.py / train.py / evaluate.py jalan end-to-end
sebelum tunggu real data dari POC field collection.

## Generation Method
- Rendered programmatically pakai cv2 (no real camera, no font external)
- Setiap digit 0-9 di-draw manual via 7 segment rectangles
- Random variations: rotation ±5°, brightness, blur, gaussian noise
- LED colors: red, amber, green
- Image size: 100-160 × 320-500 px

## Distribution
Random patterns:
- integer (1-9999)
- 1-decimal (e.g. "12.5")
- 2-decimal (e.g. "12.50")
- 3-decimal (e.g. "3.895")
- small decimal (e.g. "0.50")

## Limitations
- Tidak punya variasi real-world: glare, perspective skew, partial occlusion,
  varying camera distance/angle, real LED bleed/glow.
- Real CNN training BUTUH real data dari POC.
- Pakai dataset ini hanya untuk: smoke test, model debugging, dry-run pipeline.
