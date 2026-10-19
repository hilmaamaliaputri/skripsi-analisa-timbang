"""
Generate synthetic 7-segment dataset untuk smoke test pipeline.

Tidak menggantikan data real — hanya untuk validate scripts work end-to-end
sebelum operator collect real samples dari POC.

Usage:
  python generate_synthetic.py --count 50 --output data/synthetic.zip
  python prepare.py --input data/synthetic.zip
  python train.py --epochs 5  # quick smoke test
"""

import argparse
import csv
import io
import random
import uuid
import zipfile
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np
from tqdm import tqdm


# ─── 7-segment digit definitions ───
# Each digit specifies which segments are ON
#    aaa
#   f   b
#   f   b
#    ggg
#   e   c
#   e   c
#    ddd
SEGMENTS = {
    "0": "abcdef",
    "1": "bc",
    "2": "abdeg",
    "3": "abcdg",
    "4": "bcfg",
    "5": "acdfg",
    "6": "acdefg",
    "7": "abc",
    "8": "abcdefg",
    "9": "abcdfg",
}


def draw_segment(canvas, x, y, w, h, seg, color, t):
    """Draw a single segment of 7-segment digit. (x,y) = top-left, (w,h) = digit size, t = thickness."""
    half = h // 2
    if seg == "a":  # top horizontal
        cv2.rectangle(canvas, (x + t, y), (x + w - t, y + t), color, -1)
    elif seg == "b":  # top-right vertical
        cv2.rectangle(canvas, (x + w - t, y + t), (x + w, y + half - t // 2), color, -1)
    elif seg == "c":  # bottom-right vertical
        cv2.rectangle(canvas, (x + w - t, y + half + t // 2), (x + w, y + h - t), color, -1)
    elif seg == "d":  # bottom horizontal
        cv2.rectangle(canvas, (x + t, y + h - t), (x + w - t, y + h), color, -1)
    elif seg == "e":  # bottom-left vertical
        cv2.rectangle(canvas, (x, y + half + t // 2), (x + t, y + h - t), color, -1)
    elif seg == "f":  # top-left vertical
        cv2.rectangle(canvas, (x, y + t), (x + t, y + half - t // 2), color, -1)
    elif seg == "g":  # middle horizontal
        cv2.rectangle(canvas, (x + t, y + half - t // 2), (x + w - t, y + half + t // 2), color, -1)


def draw_char(canvas, x, y, w, h, ch, color, t):
    if ch == ".":
        cx = x + w // 2
        cy = y + h - t
        cv2.circle(canvas, (cx, cy), max(2, t // 2 + 1), color, -1)
    elif ch in SEGMENTS:
        for s in SEGMENTS[ch]:
            draw_segment(canvas, x, y, w, h, s, color, t)


# ─── Display rendering ───
def render_display(text: str, output_h: int = 120, output_w: int = 400) -> np.ndarray:
    """Render 7-segment style display untuk satu string angka."""
    # Background: dark with slight tint variation (mimicking LCD bezel/case)
    bg_palette = [
        (8, 5, 3), (10, 8, 6), (15, 10, 5), (5, 5, 5), (12, 10, 8),
        (20, 15, 8), (3, 3, 3), (18, 12, 5),  # more dark variations
        (25, 20, 15),  # slightly brighter background (like ambient light)
    ]
    bg_color = random.choice(bg_palette)
    canvas = np.full((output_h, output_w, 3), bg_color, dtype=np.uint8)

    # Optional: add subtle gradient (mimic LCD backlight uneven)
    if random.random() < 0.3:
        gradient = np.linspace(0, 15, output_h, dtype=np.int16)
        for y in range(output_h):
            canvas[y] = np.clip(canvas[y].astype(np.int16) + gradient[y], 0, 255).astype(np.uint8)

    # LED color (BGR): red-ish (paling umum) + variations
    led_palette = [
        (40, 50, 240),   # red
        (50, 60, 250),   # bright red
        (30, 40, 220),   # darker red
        (60, 70, 255),   # crimson
        (40, 130, 220),  # amber
        (60, 150, 240),  # bright amber
        (50, 200, 60),   # green LED
        (40, 180, 40),   # dark green
        (255, 220, 100), # cyan-ish (rare but exists)
        (80, 80, 230),   # dim red (low brightness)
    ]
    color = random.choice(led_palette)

    # Calculate digit dimensions
    digit_count = len(text)
    margin_y = int(output_h * 0.12)
    digit_h = output_h - 2 * margin_y
    digit_w_full = int(digit_h * 0.55)
    decimal_w = max(8, int(digit_h * 0.18))

    # Compute total width
    widths = []
    for c in text:
        widths.append(decimal_w if c == "." else digit_w_full)
    spacing = max(3, int(digit_h * 0.04))
    total_w = sum(widths) + (digit_count - 1) * spacing

    # Center horizontally
    start_x = (output_w - total_w) // 2
    if start_x < 5:
        # Image too narrow — scale down
        scale = (output_w - 20) / total_w
        widths = [max(4, int(w * scale)) for w in widths]
        total_w = sum(widths) + (digit_count - 1) * spacing
        start_x = (output_w - total_w) // 2

    thickness = max(3, int(digit_h * 0.10))

    cur_x = start_x
    for i, c in enumerate(text):
        w = widths[i]
        draw_char(canvas, cur_x, margin_y, w, digit_h, c, color, thickness)
        cur_x += w + spacing

    return canvas


def add_realistic_noise(img: np.ndarray) -> np.ndarray:
    """Tambahkan noise realistic: rotation, brightness, blur, glare, perspective, gaussian noise."""
    h, w = img.shape[:2]

    # Slight rotation (wider range)
    angle = random.uniform(-7, 7)
    M = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
    img = cv2.warpAffine(img, M, (w, h), borderMode=cv2.BORDER_REPLICATE)

    # Optional perspective skew (mimic kamera tidak tegak lurus)
    if random.random() < 0.25:
        skew = random.uniform(-0.05, 0.05)
        offset = abs(skew) * h
        src = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
        if skew > 0:
            dst = np.float32([[offset, 0], [w - offset, 0], [w, h], [0, h]])
        else:
            dst = np.float32([[0, 0], [w, 0], [w - offset, h], [offset, h]])
        M = cv2.getPerspectiveTransform(src, dst)
        img = cv2.warpPerspective(img, M, (w, h), borderMode=cv2.BORDER_REPLICATE)

    # Brightness variation
    brightness = random.uniform(0.6, 1.25)
    img = np.clip(img.astype(np.float32) * brightness, 0, 255).astype(np.uint8)

    # Optional contrast adjustment
    if random.random() < 0.3:
        contrast = random.uniform(0.8, 1.3)
        mean = img.mean()
        img = np.clip((img.astype(np.float32) - mean) * contrast + mean, 0, 255).astype(np.uint8)

    # Optional blur (mimic camera focus issues)
    if random.random() < 0.4:
        kernel = random.choice([3, 5, 7])
        img = cv2.GaussianBlur(img, (kernel, kernel), 0)

    # Optional motion blur (kamera goyang)
    if random.random() < 0.15:
        ksize = random.choice([5, 9])
        kernel = np.zeros((ksize, ksize))
        if random.random() < 0.5:
            kernel[ksize // 2, :] = 1.0 / ksize  # horizontal motion
        else:
            kernel[:, ksize // 2] = 1.0 / ksize  # vertical motion
        img = cv2.filter2D(img, -1, kernel)

    # Optional glare spot (LED reflection)
    if random.random() < 0.2:
        cx = random.randint(w // 4, 3 * w // 4)
        cy = random.randint(h // 4, 3 * h // 4)
        radius = random.randint(8, 20)
        glare = np.zeros_like(img)
        cv2.circle(glare, (cx, cy), radius, (200, 200, 220), -1)
        glare = cv2.GaussianBlur(glare, (15, 15), 0)
        img = cv2.add(img, glare)

    # Gaussian noise (sensor noise)
    noise_std = random.uniform(2, 12)
    noise = np.random.normal(0, noise_std, img.shape).astype(np.int16)
    img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    # Optional JPEG compression artifact (mimic field photo)
    if random.random() < 0.4:
        quality = random.randint(60, 85)
        ok, encoded = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, quality])
        if ok:
            img = cv2.imdecode(encoded, cv2.IMREAD_COLOR)

    return img


# ─── Realistic random values ───
def random_value() -> str:
    """Generate string angka mimicking timbangan readings."""
    pattern = random.choice([
        "integer", "integer", "integer",
        "decimal_1", "decimal_2", "decimal_2", "decimal_2",
        "decimal_3", "small_decimal",
    ])
    if pattern == "integer":
        return str(random.randint(1, 9999))
    elif pattern == "decimal_1":
        return f"{random.randint(0, 999)}.{random.randint(0, 9)}"
    elif pattern == "decimal_2":
        return f"{random.randint(0, 999)}.{random.randint(0, 99):02d}"
    elif pattern == "decimal_3":
        return f"{random.randint(0, 999)}.{random.randint(0, 999):03d}"
    else:
        return f"0.{random.randint(1, 99):02d}"


def generate_dataset(count: int, output_zip: Path, seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)

    print("─" * 60)
    print(f"ANALISA TIMBANG · Synthetic Dataset Generation")
    print("─" * 60)
    print(f"Count: {count}")
    print(f"Output: {output_zip}")

    rows = []
    images_data = []

    for i in tqdm(range(count), desc="Generating"):
        text = random_value()
        sample_id = f"syn-{i:04d}-{uuid.uuid4().hex[:6]}"

        # Vary image dimensions slightly
        h = random.choice([100, 120, 140, 160])
        w = random.choice([320, 380, 440, 500])

        img = render_display(text, output_h=h, output_w=w)
        img = add_realistic_noise(img)

        ok, encoded = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 92])
        if not ok:
            print(f"[WARN] Encode failed for {sample_id}")
            continue
        jpg_bytes = encoded.tobytes()

        crop_filename = f"crop_{sample_id}.jpg"
        images_data.append((crop_filename, jpg_bytes))

        try:
            berat = float(text)
        except ValueError:
            berat = 0.0

        rows.append({
            "id": sample_id,
            "crop_filename": crop_filename,
            "full_filename": "",
            "ground_truth": text,
            "berat_kg": berat,
            "ocr_predicted": "",
            "ocr_confidence": "",
            "ocr_model": "synthetic",
            "scale_brand": "SYNTHETIC-7SEG",
            "notes": "auto-generated for smoke testing",
            "operator": "SYN-001",
            "device_id": "synthetic-device",
            "timestamp": datetime.now().isoformat(),
        })

    # ─── Build CSV ───
    csv_buffer = io.StringIO()
    writer = csv.DictWriter(csv_buffer, fieldnames=list(rows[0].keys()), quoting=csv.QUOTE_ALL)
    writer.writeheader()
    writer.writerows(rows)
    csv_text = csv_buffer.getvalue()

    # ─── Build README ───
    readme = f"""# ANALISA TIMBANG · SYNTHETIC DATASET

Generated: {datetime.now().isoformat()}
Count: {count} samples
Seed: {seed}

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
"""

    # ─── Write ZIP ───
    output_zip.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("labels.csv", csv_text)
        z.writestr("README.md", readme)
        for filename, jpg_bytes in images_data:
            z.writestr(f"images/{filename}", jpg_bytes)

    size_kb = output_zip.stat().st_size / 1024
    print(f"\n[OK] {count} samples generated")
    print(f"     File: {output_zip}")
    print(f"     Size: {size_kb:.1f} KB")
    print(f"\nNext steps:")
    print(f"  1. python prepare.py --input {output_zip} --clean")
    print(f"  2. python train.py --epochs 5     (quick smoke test)")
    print(f"  3. python evaluate.py --model models/cnn_v1/best.h5 --data data/prepared/test/")


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic 7-segment dataset")
    parser.add_argument("--count", type=int, default=50, help="Number of samples (default: 50)")
    parser.add_argument(
        "--output", type=Path, default=Path("data/synthetic.zip"),
        help="Output ZIP path (default: data/synthetic.zip)",
    )
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    generate_dataset(args.count, args.output, args.seed)


if __name__ == "__main__":
    main()
