"""
Evaluate trained model pada test set.

Usage:
  python evaluate.py --model models/cnn_v1/best.h5 --data data/prepared/test/
"""

import argparse
import csv
import json
from collections import Counter
from pathlib import Path

import numpy as np
import tensorflow as tf
from tensorflow.keras import models, layers
import matplotlib.pyplot as plt
import seaborn as sns

import config
from train import load_image, ctc_decode, CTCLayer


def predict_full_model(model, images, batch_size=32):
    """Predict via full model dengan dummy label/length inputs.
    CTC layer return y_pred unchanged jadi tetap bisa decode.
    """
    n = len(images)
    dummy_labels = np.zeros((n, config.MAX_LABEL_LENGTH), dtype=np.int32)
    dummy_lengths = np.zeros(n, dtype=np.int32)
    return model.predict(
        {"image": images, "label": dummy_labels, "label_length": dummy_lengths},
        verbose=0, batch_size=batch_size,
    )


def edit_distance(s1: str, s2: str) -> int:
    """Levenshtein distance."""
    if len(s1) < len(s2):
        return edit_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    prev = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        curr = [i + 1]
        for j, c2 in enumerate(s2):
            ins = prev[j + 1] + 1
            de_ = curr[j] + 1
            sub = prev[j] + (c1 != c2)
            curr.append(min(ins, de_, sub))
        prev = curr
    return prev[-1]


def load_test_data(data_dir: Path) -> tuple[list[Path], list[str]]:
    csv_path = data_dir / "labels.csv"
    paths, labels = [], []
    with open(csv_path, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            paths.append(data_dir / "images" / row["filename"])
            labels.append(row["ground_truth"])
    return paths, labels


def evaluate(args):
    model_path = Path(args.model)
    data_dir = Path(args.data)
    output_dir = model_path.parent
    print("─" * 60)
    print("ANALISA TIMBANG · Evaluation")
    print("─" * 60)
    print(f"Model: {model_path}")
    print(f"Test data: {data_dir}")

    # Load model
    model = models.load_model(model_path, custom_objects={"CTCLayer": CTCLayer}, compile=False)
    print(f"  Model loaded · {model.count_params():,} params")

    # Load test
    paths, labels = load_test_data(data_dir)
    print(f"  Test samples: {len(paths)}")

    # Predict via full model (dummy label/length inputs)
    print("\n[PREDICT] Running inference...")
    import time
    batch_size = args.batch
    all_preds = []
    inference_times = []
    for i in range(0, len(paths), batch_size):
        batch_paths = paths[i:i + batch_size]
        imgs = np.array([load_image(p) for p in batch_paths])
        t0 = time.time()
        preds = predict_full_model(model, imgs, batch_size=batch_size)
        inference_times.append((time.time() - t0) / len(batch_paths))
        all_preds.append(preds)
    preds = np.concatenate(all_preds, axis=0)
    decoded = ctc_decode(preds)

    # Metrics
    n = len(labels)
    full_correct = sum(1 for p, t in zip(decoded, labels) if p == t)
    full_accuracy = full_correct / n

    # Char-level
    total_chars = sum(len(t) for t in labels)
    correct_chars = 0
    for p, t in zip(decoded, labels):
        for i in range(min(len(p), len(t))):
            if p[i] == t[i]:
                correct_chars += 1
    char_accuracy = correct_chars / total_chars if total_chars > 0 else 0

    # Edit distance
    edit_distances = [edit_distance(p, t) for p, t in zip(decoded, labels)]
    avg_edit = np.mean(edit_distances)

    # Per-length accuracy
    by_length = {}
    for p, t in zip(decoded, labels):
        L = len(t)
        if L not in by_length:
            by_length[L] = {"correct": 0, "total": 0}
        by_length[L]["total"] += 1
        if p == t:
            by_length[L]["correct"] += 1

    avg_inference_ms = np.mean(inference_times) * 1000

    # Print
    print(f"\n[RESULTS]")
    print(f"  Full-string accuracy: {full_accuracy:.4f} ({full_correct}/{n})")
    print(f"  Char-level accuracy:  {char_accuracy:.4f} ({correct_chars}/{total_chars})")
    print(f"  Avg edit distance:    {avg_edit:.2f}")
    print(f"  Inference time:       {avg_inference_ms:.1f} ms/image (CPU)")

    target_met = full_accuracy >= config.TARGET_FULL_ACC
    print(f"\n  Target {config.TARGET_FULL_ACC:.0%} full-string: {'✅ MET' if target_met else '❌ NOT MET'}")

    print(f"\n[BY LENGTH]")
    for L in sorted(by_length.keys()):
        info = by_length[L]
        acc = info["correct"] / info["total"]
        print(f"  Length {L}: {info['correct']:3d}/{info['total']:3d} ({acc * 100:.1f}%)")

    # Save failures
    failures = [
        {"filename": str(paths[i].name), "ground_truth": labels[i], "predicted": decoded[i],
         "edit_distance": edit_distances[i]}
        for i in range(n) if labels[i] != decoded[i]
    ]
    failures_path = output_dir / "failures.csv"
    if failures:
        with open(failures_path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=list(failures[0].keys()))
            writer.writeheader()
            writer.writerows(failures)
        print(f"\n[FAILURES] {len(failures)} cases saved → {failures_path}")

    # Confusion matrix per-character
    char_pairs = []
    for p, t in zip(decoded, labels):
        # Pair each predicted char with corresponding true char
        for i in range(min(len(p), len(t))):
            char_pairs.append((t[i], p[i]))
    if char_pairs:
        true_chars, pred_chars = zip(*char_pairs)
        labels_set = sorted(set(true_chars) | set(pred_chars))
        n_classes = len(labels_set)
        cm = np.zeros((n_classes, n_classes), dtype=int)
        idx = {c: i for i, c in enumerate(labels_set)}
        for t, p in char_pairs:
            cm[idx[t], idx[p]] += 1

        plt.figure(figsize=(8, 6))
        sns.heatmap(cm, annot=True, fmt="d", cmap="YlOrRd",
                    xticklabels=labels_set, yticklabels=labels_set, cbar=False)
        plt.xlabel("Predicted")
        plt.ylabel("Ground Truth")
        plt.title(f"Confusion Matrix · {n} samples · {full_accuracy * 100:.1f}% full acc")
        plt.tight_layout()
        cm_path = output_dir / "confusion_matrix.png"
        plt.savefig(cm_path, dpi=120)
        plt.close()
        print(f"[CONFUSION] Saved → {cm_path}")

    # Save report
    report = {
        "model": str(model_path),
        "test_data": str(data_dir),
        "n_samples": n,
        "full_string_accuracy": full_accuracy,
        "char_accuracy": char_accuracy,
        "avg_edit_distance": float(avg_edit),
        "inference_time_ms": float(avg_inference_ms),
        "target_full_acc": config.TARGET_FULL_ACC,
        "target_met": bool(target_met),
        "by_length": {str(k): v for k, v in by_length.items()},
        "n_failures": len(failures),
    }
    report_path = output_dir / "evaluation_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"[REPORT] Saved → {report_path}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--data", required=True)
    parser.add_argument("--batch", type=int, default=32)
    args = parser.parse_args()
    evaluate(args)


if __name__ == "__main__":
    main()
