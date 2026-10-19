"""
Train CRNN + CTC model untuk variable-length 7-segment digit recognition.

Architecture:
  Input (64×256×1) → 7 Conv blocks → Reshape → 2 BiLSTM → Dense → CTC

Usage:
  python train.py --data data/prepared/ --output models/cnn_v1/
  python train.py --data data/prepared/ --output models/cnn_v2/ --epochs 100 --batch 64
"""

import argparse
import csv
import json
import time
from pathlib import Path

import cv2
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models, callbacks
from tensorflow.keras.optimizers import Adam
import matplotlib.pyplot as plt

import config


# ─── Reproducibility ───
tf.random.set_seed(config.SEED)
np.random.seed(config.SEED)


# ─── Data loading ───
def load_split(split_dir: Path) -> tuple[list[Path], list[str]]:
    """Load image paths + ground truth dari split folder."""
    csv_path = split_dir / "labels.csv"
    if not csv_path.exists():
        raise FileNotFoundError(f"labels.csv tidak ditemukan di {split_dir}")

    paths, labels = [], []
    with open(csv_path, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            paths.append(split_dir / "images" / row["filename"])
            labels.append(row["ground_truth"])
    return paths, labels


def load_image(path: Path) -> np.ndarray:
    """Load + resize image ke (HEIGHT, WIDTH) grayscale, normalize 0-1."""
    img = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError(f"Failed to load: {path}")
    # Aspect-aware resize: scale to fit height, pad/center horizontally
    h, w = img.shape
    target_h, target_w = config.IMG_HEIGHT, config.IMG_WIDTH
    scale = target_h / h
    new_w = int(w * scale)
    img = cv2.resize(img, (new_w, target_h), interpolation=cv2.INTER_AREA)
    if new_w >= target_w:
        # Crop center
        start = (new_w - target_w) // 2
        img = img[:, start:start + target_w]
    else:
        # Pad with white (matches preprocessing convention)
        pad_left = (target_w - new_w) // 2
        pad_right = target_w - new_w - pad_left
        img = cv2.copyMakeBorder(img, 0, 0, pad_left, pad_right,
                                   cv2.BORDER_CONSTANT, value=255)
    img = img.astype(np.float32) / 255.0
    return img[..., np.newaxis]


def load_split_arrays(paths: list[Path], labels: list[str]):
    """Load semua image + label ke numpy arrays.
    Cocok untuk small/medium dataset (≤ 10k sample). Lebih simple dari tf.data.Dataset.
    """
    n = len(paths)
    images = np.zeros((n, config.IMG_HEIGHT, config.IMG_WIDTH, config.IMG_CHANNELS), dtype=np.float32)
    label_arr = np.full((n, config.MAX_LABEL_LENGTH), config.NUM_CLASSES, dtype=np.int32)  # padded with blank
    label_lengths = np.zeros(n, dtype=np.int32)

    for i, (p, lbl) in enumerate(zip(paths, labels)):
        images[i] = load_image(p)
        encoded = config.encode_label(lbl)[: config.MAX_LABEL_LENGTH]
        label_arr[i, : len(encoded)] = encoded
        label_lengths[i] = len(encoded)

    return images, label_arr, label_lengths


# ─── CRNN Model ───
def build_inference_model(input_shape=(config.IMG_HEIGHT, config.IMG_WIDTH, 1)):
    """Inference-only model (image → softmax logits). ONNX-exportable.
    Akan di-wrap dengan CTC layer untuk training (lihat build_training_model).
    """
    image_input = layers.Input(shape=input_shape, name="image", dtype=tf.float32)

    x = image_input
    for i, filters in enumerate(config.CNN_FILTERS):
        x = layers.Conv2D(filters, 3, padding="same", name=f"conv_{i}")(x)
        x = layers.BatchNormalization(name=f"bn_{i}")(x)
        x = layers.Activation("relu", name=f"relu_{i}")(x)
        if i in (0, 1):
            x = layers.MaxPool2D(2, name=f"pool_{i}")(x)
        elif i in (3, 5):
            x = layers.MaxPool2D((1, 2), name=f"pool_{i}")(x)

    shape = tf.keras.backend.int_shape(x)
    _, H, W, C = shape
    x = layers.Reshape((W, H * C), name="reshape")(x)
    x = layers.Dense(config.LSTM_UNITS, activation="relu", name="fc_pre_lstm")(x)
    x = layers.Dropout(config.DROPOUT, name="dropout_pre_lstm")(x)

    # use_cudnn=False supaya ONNX-exportable
    x = layers.Bidirectional(
        layers.LSTM(config.LSTM_UNITS, return_sequences=True, use_cudnn=False),
        name="bilstm_1",
    )(x)
    x = layers.Dropout(config.DROPOUT, name="dropout_1")(x)
    x = layers.Bidirectional(
        layers.LSTM(config.LSTM_UNITS, return_sequences=True, use_cudnn=False),
        name="bilstm_2",
    )(x)
    x = layers.Dropout(config.DROPOUT, name="dropout_2")(x)
    output = layers.Dense(config.NUM_CLASSES + 1, activation="softmax", name="output")(x)

    return models.Model(inputs=image_input, outputs=output, name="ocr_inference")


def build_training_model(inference_model):
    """Wrap inference model dengan CTC layer untuk training.
    Setelah training, inference_model otomatis punya trained weights (shared layers).
    """
    image_input = inference_model.input
    output = inference_model.output

    label_input = layers.Input(shape=(config.MAX_LABEL_LENGTH,), name="label", dtype=tf.int32)
    label_length_input = layers.Input(shape=(), name="label_length", dtype=tf.int32)

    ctc_output = CTCLayer(name="ctc_loss")(label_input, output, label_length_input)
    return models.Model(
        inputs=[image_input, label_input, label_length_input],
        outputs=ctc_output,
        name="ocr_training",
    )


def build_model(input_shape=(config.IMG_HEIGHT, config.IMG_WIDTH, 1)):
    """Backwards-compat wrapper: returns training model."""
    inf_model = build_inference_model(input_shape)
    return build_training_model(inf_model)


class CTCLayer(layers.Layer):
    """Layer custom untuk compute CTC loss inside the model."""

    def __init__(self, name=None, **kwargs):
        super().__init__(name=name, **kwargs)
        self.loss_fn = tf.keras.backend.ctc_batch_cost

    def call(self, y_true, y_pred, label_length):
        batch_len = tf.cast(tf.shape(y_true)[0], dtype="int64")
        input_length = tf.cast(tf.shape(y_pred)[1], dtype="int64")
        input_length = input_length * tf.ones(shape=(batch_len, 1), dtype="int64")
        label_length = tf.cast(label_length, dtype="int64")
        label_length = tf.reshape(label_length, (batch_len, 1))

        loss = self.loss_fn(y_true, y_pred, input_length, label_length)
        self.add_loss(loss)
        return y_pred


# ─── Decoder ───
def ctc_decode(predictions: np.ndarray) -> list[str]:
    """Greedy CTC decode: pick argmax per timestep, collapse repeats, remove blanks."""
    decoded = []
    for seq in predictions:
        # seq shape: (T, num_classes+1)
        argmax = np.argmax(seq, axis=1)
        result = []
        prev = -1
        for c in argmax:
            if c != prev and c < len(config.VOCAB):
                result.append(config.idx_to_char(int(c)))
            prev = c
        decoded.append("".join(result))
    return decoded


# ─── Char-level accuracy callback ───
class CharAccuracy(callbacks.Callback):
    """Compute & log full-string + char-level accuracy on val set every epoch.
    Pakai full model dengan dummy label/length inputs — CTC layer return y_pred apa adanya.
    """

    def __init__(self, val_images: np.ndarray, val_labels: list[str]):
        super().__init__()
        self.val_images = val_images
        self.val_labels = val_labels
        n = len(val_labels)
        # Dummy inputs untuk label & length — tidak dipakai saat predict, hanya supaya model.predict happy
        self.dummy_labels = np.zeros((n, config.MAX_LABEL_LENGTH), dtype=np.int32)
        self.dummy_lengths = np.zeros(n, dtype=np.int32)

    def on_epoch_end(self, epoch, logs=None):
        # Predict via full model — CTC layer return y_pred unchanged
        preds = self.model.predict(
            {"image": self.val_images, "label": self.dummy_labels, "label_length": self.dummy_lengths},
            verbose=0, batch_size=32,
        )
        decoded = ctc_decode(preds)

        n = len(self.val_labels)
        full_correct = sum(1 for p, t in zip(decoded, self.val_labels) if p == t)
        char_correct = 0
        char_total = 0
        for p, t in zip(decoded, self.val_labels):
            for j in range(min(len(p), len(t))):
                if p[j] == t[j]:
                    char_correct += 1
            char_total += max(len(p), len(t))

        full_acc = full_correct / n if n > 0 else 0
        char_acc = char_correct / char_total if char_total > 0 else 0

        logs = logs or {}
        logs["val_full_acc"] = full_acc
        logs["val_char_acc"] = char_acc
        print(f" — val_full_acc: {full_acc:.4f} — val_char_acc: {char_acc:.4f}")


# ─── Training ───
def train(args):
    data_dir = Path(args.data)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    print("─" * 60)
    print("ANALISA TIMBANG · CRNN Training")
    print("─" * 60)
    print(f"Data: {data_dir}")
    print(f"Output: {output_dir}")
    print(f"Vocab: {config.VOCAB} (size {config.NUM_CLASSES})")

    # Load splits ke numpy arrays
    print("\n[LOAD] Datasets")
    train_paths, train_labels = load_split(data_dir / "train")
    val_paths, val_labels = load_split(data_dir / "val")
    print(f"  Train: {len(train_paths)} samples")
    print(f"  Val:   {len(val_paths)} samples")

    print("  Loading images to memory...")
    train_imgs, train_lbl_arr, train_lengths = load_split_arrays(train_paths, train_labels)
    val_imgs, val_lbl_arr, val_lengths = load_split_arrays(val_paths, val_labels)

    # Build inference model (ONNX-exportable) lalu wrap dengan CTC untuk training
    print("\n[BUILD] Inference model (image → output)")
    inference_model = build_inference_model()
    print(f"  Inference params: {inference_model.count_params():,}")

    print("\n[BUILD] Training model (with CTC layer)")
    model = build_training_model(inference_model)
    model.compile(optimizer=Adam(learning_rate=args.lr))
    model.summary()

    n_params = model.count_params()
    print(f"  Total training params: {n_params:,}")

    # Callbacks — IMPORTANT: CharAccuracy WAJIB sebelum ModelCheckpoint
    # supaya val_full_acc tersedia saat checkpoint di-evaluate
    cb_list = [
        CharAccuracy(val_imgs, val_labels),
        callbacks.ModelCheckpoint(
            filepath=str(output_dir / "best.h5"),
            monitor="val_full_acc",
            mode="max",
            save_best_only=True,
            verbose=1,
        ),
        callbacks.EarlyStopping(
            monitor="val_full_acc",
            mode="max",
            patience=config.PATIENCE,
            restore_best_weights=True,
            verbose=1,
        ),
        callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=5,
            min_lr=1e-6,
            verbose=1,
        ),
        callbacks.CSVLogger(str(output_dir / "training.csv")),
    ]

    # Train
    print(f"\n[TRAIN] {args.epochs} epochs · batch {args.batch} · lr {args.lr}")
    start = time.time()

    train_inputs = {"image": train_imgs, "label": train_lbl_arr, "label_length": train_lengths}
    val_inputs = {"image": val_imgs, "label": val_lbl_arr, "label_length": val_lengths}

    history = model.fit(
        train_inputs,
        train_lbl_arr,  # dummy target — CTC computes loss internally via add_loss
        validation_data=(val_inputs, val_lbl_arr),
        batch_size=args.batch,
        epochs=args.epochs,
        callbacks=cb_list,
        shuffle=True,
        verbose=1,
    )
    duration = time.time() - start
    print(f"\n[OK] Training selesai dalam {duration / 60:.1f} menit")

    # Save final model + inference-only (for ONNX export) + history + plots
    model.save(output_dir / "final.h5")
    inference_model.save(output_dir / "inference.h5")  # ONNX-friendly: image input only
    with open(output_dir / "history.json", "w") as f:
        json.dump({k: [float(x) for x in v] for k, v in history.history.items()}, f, indent=2)

    plot_curves(history, output_dir / "training_curves.png")
    print(f"[OK] Saved: best.h5 (training), inference.h5 (deploy), final.h5, history.json, curves")
    print(f"\nNext steps:")
    print(f"  python evaluate.py --model {output_dir}/best.h5 --data {data_dir}/test/")
    print(f"  python export_onnx.py --model {output_dir}/inference.h5 --output {output_dir}/model.onnx")


def plot_curves(history, output_path: Path):
    fig, axes = plt.subplots(1, 2, figsize=(12, 4))
    h = history.history
    axes[0].plot(h.get("loss", []), label="train")
    axes[0].plot(h.get("val_loss", []), label="val")
    axes[0].set_title("Loss")
    axes[0].set_xlabel("Epoch")
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)

    if "val_full_acc" in h:
        axes[1].plot(h["val_full_acc"], label="val full-string acc", color="green")
    if "val_char_acc" in h:
        axes[1].plot(h["val_char_acc"], label="val char acc", color="blue", alpha=0.6)
    axes[1].axhline(y=config.TARGET_FULL_ACC, color="red", linestyle="--", alpha=0.5, label=f"target {config.TARGET_FULL_ACC:.0%}")
    axes[1].set_title("Validation Accuracy")
    axes[1].set_xlabel("Epoch")
    axes[1].set_ylim(0, 1)
    axes[1].legend()
    axes[1].grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(output_path, dpi=120)
    plt.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=str, default=str(config.PREPARED_DIR), help="Prepared data folder")
    parser.add_argument("--output", type=str, default=str(config.MODELS_DIR / "cnn_v1"), help="Output folder")
    parser.add_argument("--epochs", type=int, default=config.EPOCHS)
    parser.add_argument("--batch", type=int, default=config.BATCH_SIZE)
    parser.add_argument("--lr", type=float, default=config.LEARNING_RATE)
    args = parser.parse_args()
    train(args)


if __name__ == "__main__":
    main()
