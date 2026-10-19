"""
Single image inference test.

Usage:
  python predict.py --model models/cnn_v1/best.h5 --image samples/test01.jpg
"""

import argparse
import time
from pathlib import Path

import numpy as np
from tensorflow.keras import models

import config
from train import load_image, ctc_decode, CTCLayer


def predict(args):
    model_path = Path(args.model)
    image_path = Path(args.image)

    print(f"Loading model: {model_path}")
    model = models.load_model(model_path, custom_objects={"CTCLayer": CTCLayer}, compile=False)

    print(f"Loading image: {image_path}")
    img = load_image(image_path)
    img_batch = img[np.newaxis, ...]
    dummy_label = np.zeros((1, config.MAX_LABEL_LENGTH), dtype=np.int32)
    dummy_length = np.zeros(1, dtype=np.int32)

    print("Running inference...")
    t0 = time.time()
    preds = model.predict(
        {"image": img_batch, "label": dummy_label, "label_length": dummy_length},
        verbose=0,
    )
    inference_ms = (time.time() - t0) * 1000

    decoded = ctc_decode(preds)
    text = decoded[0]

    # Confidence: average max prob per timestep yang kebetulan menjadi karakter (bukan blank)
    seq = preds[0]  # (T, num_classes)
    argmax = np.argmax(seq, axis=1)
    char_confs = []
    prev = -1
    for i, c in enumerate(argmax):
        if c != prev and c < len(config.VOCAB):
            char_confs.append(seq[i, c])
        prev = c
    avg_conf = float(np.mean(char_confs)) if char_confs else 0.0

    print()
    print(f"  Predicted:        \"{text}\"")
    print(f"  Confidence:       {avg_conf:.3f} ({avg_conf * 100:.1f}%)")
    print(f"  Inference time:   {inference_ms:.1f} ms")
    print(f"  Char count:       {len(text)}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--image", required=True)
    args = parser.parse_args()
    predict(args)


if __name__ == "__main__":
    main()
