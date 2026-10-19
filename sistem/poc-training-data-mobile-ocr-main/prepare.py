"""
Prepare dataset dari ZIP yang di-export dari POC PWA.

Workflow:
  1. Extract ZIP yang berisi labels.csv + images/
  2. Filter sample yang valid (image ada, label bukan kosong)
  3. Split train/val/test (80/10/10) — stratified by digit count length
  4. Apply augmentation pada train set (rotate, brightness, blur, noise)
  5. Output: data/prepared/{train,val,test}/{images.csv, images/}

Usage:
  python prepare.py --input data/analisa-training-2026-05-15.zip
  python prepare.py --input data/raw/ --output data/prepared/  # if already extracted

Note: input bisa ZIP atau folder yang sudah ada labels.csv + images/
"""

import argparse
import csv
import json
import shutil
import zipfile
from collections import defaultdict
from pathlib import Path
from typing import Iterable

import cv2
import numpy as np
from sklearn.model_selection import train_test_split
from tqdm import tqdm

import config

try:
    import albumentations as A
except ImportError:
    A = None


# ─── Augmentation pipeline ───
def build_augment_pipeline():
    if A is None:
        raise ImportError("albumentations belum terinstall. Run: pip install albumentations")
    return A.Compose([
        A.Rotate(limit=config.AUG_ROTATION_DEG, p=0.7, border_mode=cv2.BORDER_REPLICATE),
        A.RandomBrightnessContrast(
            brightness_limit=config.AUG_BRIGHTNESS_PCT,
            contrast_limit=config.AUG_BRIGHTNESS_PCT,
            p=0.6,
        ),
        A.OneOf([
            A.Blur(blur_limit=config.AUG_BLUR_KERNEL_MAX, p=0.5),
            A.MotionBlur(blur_limit=config.AUG_BLUR_KERNEL_MAX, p=0.5),
        ], p=0.4),
        A.GaussNoise(var_limit=(config.AUG_NOISE_STD ** 2 * 255 ** 2), p=0.4),
        A.RandomScale(scale_limit=0.1, p=0.3),
    ])


def load_image(path: Path) -> np.ndarray:
    """Load image dan convert ke grayscale."""
    img = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError(f"Failed to load image: {path}")
    return img


def save_image(img: np.ndarray, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(path), img)


# ─── Data loading ───
def parse_input(input_path: Path) -> Path:
    """Extract ZIP jika perlu, return folder berisi labels.csv + images/."""
    if input_path.is_file() and input_path.suffix == ".zip":
        extract_dir = input_path.parent / input_path.stem
        if extract_dir.exists():
            print(f"  Found existing extracted folder: {extract_dir}")
        else:
            print(f"  Extracting {input_path.name} → {extract_dir}/")
            with zipfile.ZipFile(input_path) as z:
                z.extractall(extract_dir)
        return extract_dir
    if input_path.is_dir():
        return input_path
    raise ValueError(f"Input bukan ZIP atau folder: {input_path}")


def load_samples(folder: Path) -> list[dict]:
    """Read labels.csv, return list of valid samples."""
    csv_path = folder / "labels.csv"
    if not csv_path.exists():
        raise FileNotFoundError(f"labels.csv not found in {folder}")

    samples = []
    skipped = 0
    with open(csv_path, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            crop_file = row.get("crop_filename", "").strip()
            ground_truth = row.get("ground_truth", "").strip()
            if not crop_file or not ground_truth:
                skipped += 1
                continue
            img_path = folder / "images" / crop_file
            if not img_path.exists():
                skipped += 1
                continue
            # Validasi: ground truth harus mengandung digit
            if not any(c.isdigit() for c in ground_truth):
                skipped += 1
                continue
            samples.append({
                "image_path": img_path,
                "ground_truth": ground_truth,
                "id": row.get("id", ""),
                "ocr_predicted": row.get("ocr_predicted", ""),
                "ocr_model": row.get("ocr_model", ""),
                "scale_brand": row.get("scale_brand", ""),
                "operator": row.get("operator", ""),
            })
    print(f"  Loaded {len(samples)} valid samples (skipped {skipped})")
    return samples


# ─── Stratified split by digit length ───
def stratified_split(samples: list[dict]) -> tuple[list, list, list]:
    """Split berdasarkan length ground truth (string length) supaya distribusi merata."""
    by_length = defaultdict(list)
    for s in samples:
        by_length[len(s["ground_truth"])].append(s)

    train, val, test = [], [], []
    for length, group in by_length.items():
        if len(group) < 3:
            # Terlalu sedikit untuk split — masukkan semua ke train
            train.extend(group)
            continue
        # Stratified: train 80%, val 10%, test 10%
        rest, te = train_test_split(
            group, test_size=config.TEST_RATIO, random_state=config.SEED,
        )
        rel_val = config.VAL_RATIO / (config.TRAIN_RATIO + config.VAL_RATIO)
        tr, va = train_test_split(rest, test_size=rel_val, random_state=config.SEED)
        train.extend(tr)
        val.extend(va)
        test.extend(te)

    return train, val, test


# ─── Save split ───
def save_split(samples: list[dict], split_dir: Path, augment_pipeline=None, augment_count=0):
    """Save samples ke split_dir. Optionally augment & save tambahan."""
    images_dir = split_dir / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    rows = []
    for i, s in enumerate(tqdm(samples, desc=f"  {split_dir.name}")):
        # Save original
        out_name = f"{i:05d}.jpg"
        img = load_image(s["image_path"])
        save_image(img, images_dir / out_name)
        rows.append({
            "filename": out_name,
            "ground_truth": s["ground_truth"],
            "is_augmented": False,
            "source_id": s["id"],
            "scale_brand": s["scale_brand"],
            "ocr_predicted": s["ocr_predicted"],
            "ocr_model": s["ocr_model"],
        })

        # Augmentations (only for train split)
        if augment_pipeline is not None and augment_count > 0:
            for k in range(augment_count):
                aug_name = f"{i:05d}_aug{k}.jpg"
                augmented = augment_pipeline(image=img)["image"]
                save_image(augmented, images_dir / aug_name)
                rows.append({
                    "filename": aug_name,
                    "ground_truth": s["ground_truth"],
                    "is_augmented": True,
                    "source_id": s["id"],
                    "scale_brand": s["scale_brand"],
                    "ocr_predicted": s["ocr_predicted"],
                    "ocr_model": s["ocr_model"],
                })

    # Write labels.csv
    csv_path = split_dir / "labels.csv"
    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    print(f"  Saved {len(rows)} rows → {csv_path}")


# ─── Stats ───
def compute_stats(samples: list[dict]) -> dict:
    digit_lengths = defaultdict(int)
    char_counts = defaultdict(int)
    brand_counts = defaultdict(int)
    for s in samples:
        digit_lengths[len(s["ground_truth"])] += 1
        for c in s["ground_truth"]:
            char_counts[c] += 1
        brand_counts[s.get("scale_brand", "(unspecified)")] += 1
    return {
        "total": len(samples),
        "by_length": dict(sorted(digit_lengths.items())),
        "by_char": dict(sorted(char_counts.items())),
        "by_brand": dict(sorted(brand_counts.items(), key=lambda x: -x[1])),
    }


# ─── Main ───
def main():
    parser = argparse.ArgumentParser(description="Prepare training dataset dari POC export ZIP")
    parser.add_argument("--input", type=Path, required=True, help="ZIP file atau folder hasil extract")
    parser.add_argument("--output", type=Path, default=config.PREPARED_DIR, help="Output folder (default: data/prepared/)")
    parser.add_argument("--no-augment", action="store_true", help="Skip augmentation pada train set")
    parser.add_argument("--clean", action="store_true", help="Hapus output folder dulu jika sudah ada")
    args = parser.parse_args()

    print("─" * 60)
    print("ANALISA TIMBANG · Dataset Preparation")
    print("─" * 60)

    # Cleanup
    if args.clean and args.output.exists():
        print(f"[CLEAN] Removing {args.output}/")
        shutil.rmtree(args.output)
    args.output.mkdir(parents=True, exist_ok=True)

    # Load
    print(f"\n[LOAD] Input: {args.input}")
    folder = parse_input(args.input)
    samples = load_samples(folder)
    if not samples:
        raise SystemExit("No valid samples found!")

    # Stats raw
    raw_stats = compute_stats(samples)
    print(f"\n[STATS] Total: {raw_stats['total']}")
    print(f"  By length: {raw_stats['by_length']}")
    print(f"  By char: {raw_stats['by_char']}")
    print(f"  By brand: {raw_stats['by_brand']}")

    # Split
    print(f"\n[SPLIT] Stratified by digit length")
    train, val, test = stratified_split(samples)
    print(f"  Train: {len(train)} ({len(train)/len(samples)*100:.1f}%)")
    print(f"  Val:   {len(val)} ({len(val)/len(samples)*100:.1f}%)")
    print(f"  Test:  {len(test)} ({len(test)/len(samples)*100:.1f}%)")

    # Augment
    aug_pipeline = None
    if not args.no_augment:
        print(f"\n[AUGMENT] Pipeline: rotate ±{config.AUG_ROTATION_DEG}° · brightness ±{int(config.AUG_BRIGHTNESS_PCT*100)}% · blur · noise")
        aug_pipeline = build_augment_pipeline()
        print(f"  {config.AUG_SAMPLES_PER_ORIGINAL} augmented variants per training sample")

    # Save splits
    print(f"\n[SAVE] Output: {args.output}/")
    save_split(train, args.output / "train", aug_pipeline, config.AUG_SAMPLES_PER_ORIGINAL)
    save_split(val, args.output / "val")
    save_split(test, args.output / "test")

    # Save stats
    stats = {
        "raw": raw_stats,
        "splits": {
            "train": compute_stats(train),
            "val": compute_stats(val),
            "test": compute_stats(test),
        },
        "config": {
            "augment": not args.no_augment,
            "augment_count_per_sample": config.AUG_SAMPLES_PER_ORIGINAL if not args.no_augment else 0,
            "img_height": config.IMG_HEIGHT,
            "img_width": config.IMG_WIDTH,
            "vocab": config.VOCAB,
        },
    }
    stats_path = args.output / "stats.json"
    with open(stats_path, "w") as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)
    print(f"\n[OK] Stats saved → {stats_path}")
    print(f"[OK] Dataset ready di {args.output}/")
    print(f"\nNext: python train.py --data {args.output}/")


if __name__ == "__main__":
    main()
