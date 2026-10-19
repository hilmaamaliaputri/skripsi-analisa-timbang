"""
Train CRNN+CTC dengan TRANSFER LEARNING dari MobileNetV3-Small ImageNet pretrained.

Difference vs train.py:
  - train.py:        CNN dari scratch (semua weights random init)
  - train_transfer.py: backbone pretrained ImageNet (proven feature extractor)

Expected:
  - Convergence lebih cepat (10-20 epoch vs 50)
  - Akurasi lebih tinggi dengan data lebih sedikit
  - Lebih robust ke variasi real-world (lighting, blur, dll)

Usage:
  python train_transfer.py --data data/prepared/ --output models/cnn_transfer_v1/

Notes:
  - Input 64×256×1 di-convert ke RGB (replicate channel × 3)
  - MobileNetV3-Small backbone (alpha=1.0, ~2.5M params)
  - Backbone freeze pada early epochs, lalu unfreeze untuk fine-tune
"""

import argparse
import json
import time
from pathlib import Path

import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models, callbacks, Input, Model
from tensorflow.keras.applications import MobileNetV3Small
from tensorflow.keras.optimizers import Adam
import matplotlib.pyplot as plt

import config
from train import (
    load_split, load_split_arrays, ctc_decode, CTCLayer,
    CharAccuracy, plot_curves,
)


# ─── Reproducibility ───
tf.random.set_seed(config.SEED)
np.random.seed(config.SEED)


# ─── Transfer Learning Model ───
def build_transfer_inference_model(input_shape=(config.IMG_HEIGHT, config.IMG_WIDTH, 1),
                                    freeze_backbone=True):
    """Build inference model dengan MobileNetV3-Small ImageNet pretrained backbone.

    Architecture:
      Input (64×256×1 grayscale)
          ↓
      Convert to RGB (replicate channel × 3)
          ↓
      MobileNet preprocessing (-1 to 1 range)
          ↓
      MobileNetV3-Small backbone (ImageNet pretrained)
          ├─ Total stride 32 → output (H/32, W/32, channels)
          └─ For 64×256 input: output (2, 8, 96-576)
          ↓
      Reshape ke sequence (T=8, features)
          ↓
      Dense + Dropout
          ↓
      BiLSTM × 2 (use_cudnn=False)
          ↓
      Dense softmax (12 classes)
    """
    image_input = Input(shape=input_shape, name="image", dtype=tf.float32)

    # ─── Stage 1: Grayscale → RGB ───
    # MobileNetV3 needs 3-channel input. Replicate single channel.
    x_rgb = layers.Concatenate(axis=-1, name="grayscale_to_rgb")(
        [image_input, image_input, image_input]
    )

    # ─── Stage 2: MobileNet preprocessing ───
    # MobileNetV3 expects input range [-1, 1]. Our input is [0, 1].
    # preprocess_input subtracts mean and divides by std (effectively).
    # Simpler: scale [0,1] → [-1, 1] via x*2 - 1
    x_rgb = layers.Lambda(lambda x: x * 2.0 - 1.0, name="rgb_normalize",
                          output_shape=lambda s: s)(x_rgb)

    # ─── Stage 3: Pretrained backbone ───
    # MobileNetV3-Small alpha=1.0: ~2.5M params, fast inference
    backbone = MobileNetV3Small(
        input_shape=(config.IMG_HEIGHT, config.IMG_WIDTH, 3),
        alpha=1.0,
        include_top=False,
        weights="imagenet",
        include_preprocessing=False,  # we handled it via Lambda
        name="mobilenet_v3_backbone",
    )
    if freeze_backbone:
        backbone.trainable = False
        print("  Backbone FROZEN (untuk warmup phase)")
    else:
        backbone.trainable = True
        print("  Backbone TRAINABLE (fine-tuning phase)")

    features = backbone(x_rgb)
    # Output shape: (None, 2, 8, 576) untuk input 64×256

    # ─── Stage 4: Sequence formation ───
    # Reshape (H=2, W=8, C=576) → (W=8, H*C=1152) sebagai sequence dengan T=8
    shape = tf.keras.backend.int_shape(features)
    _, H, W, C = shape
    x = layers.Reshape((W, H * C), name="reshape_to_sequence")(features)

    # ─── Stage 5: CRNN head ───
    x = layers.Dense(config.LSTM_UNITS, activation="relu", name="fc_pre_lstm")(x)
    x = layers.Dropout(config.DROPOUT, name="dropout_pre_lstm")(x)

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

    return Model(inputs=image_input, outputs=output, name="ocr_transfer_inference")


def build_transfer_training_model(inference_model):
    """Wrap inference model dengan CTC layer untuk training."""
    image_input = inference_model.input
    output = inference_model.output

    label_input = Input(shape=(config.MAX_LABEL_LENGTH,), name="label", dtype=tf.int32)
    label_length_input = Input(shape=(), name="label_length", dtype=tf.int32)

    ctc_output = CTCLayer(name="ctc_loss")(label_input, output, label_length_input)
    return Model(
        inputs=[image_input, label_input, label_length_input],
        outputs=ctc_output,
        name="ocr_transfer_training",
    )


# ─── Two-Phase Training ───
def train(args):
    data_dir = Path(args.data)
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    print("─" * 60)
    print("ANALISA TIMBANG · CRNN Transfer Learning")
    print("─" * 60)
    print(f"Data: {data_dir}")
    print(f"Output: {output_dir}")
    print(f"Strategy: 2-phase (warmup head + fine-tune all)")

    # Load data
    print("\n[LOAD] Datasets")
    train_paths, train_labels = load_split(data_dir / "train")
    val_paths, val_labels = load_split(data_dir / "val")
    print(f"  Train: {len(train_paths)} samples")
    print(f"  Val:   {len(val_paths)} samples")

    print("  Loading images to memory...")
    train_imgs, train_lbl_arr, train_lengths = load_split_arrays(train_paths, train_labels)
    val_imgs, val_lbl_arr, val_lengths = load_split_arrays(val_paths, val_labels)

    train_inputs = {"image": train_imgs, "label": train_lbl_arr, "label_length": train_lengths}
    val_inputs = {"image": val_imgs, "label": val_lbl_arr, "label_length": val_lengths}

    # ─── Phase 1: Warmup (backbone frozen, train head only) ───
    print("\n" + "═" * 60)
    print("[PHASE 1] WARMUP — backbone frozen, train head only")
    print("═" * 60)

    inference_model = build_transfer_inference_model(freeze_backbone=True)
    print(f"  Inference params: {inference_model.count_params():,}")
    trainable_params = sum([tf.size(w).numpy() for w in inference_model.trainable_weights])
    print(f"  Trainable params: {trainable_params:,}")

    model = build_transfer_training_model(inference_model)
    model.compile(optimizer=Adam(learning_rate=args.lr_warmup))

    cb_warmup = [
        CharAccuracy(val_imgs, val_labels),
        callbacks.ModelCheckpoint(
            filepath=str(output_dir / "best_warmup.h5"),
            monitor="val_full_acc",
            mode="max",
            save_best_only=True,
            verbose=1,
        ),
        callbacks.EarlyStopping(
            monitor="val_full_acc",
            mode="max",
            patience=5,
            restore_best_weights=True,
            verbose=1,
        ),
        callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=3,
            min_lr=1e-6,
            verbose=1,
        ),
        callbacks.CSVLogger(str(output_dir / "training_warmup.csv")),
    ]

    print(f"\n[TRAIN] Phase 1 · {args.epochs_warmup} epochs · batch {args.batch} · lr {args.lr_warmup}")
    start = time.time()
    history_warmup = model.fit(
        train_inputs, train_lbl_arr,
        validation_data=(val_inputs, val_lbl_arr),
        batch_size=args.batch,
        epochs=args.epochs_warmup,
        callbacks=cb_warmup,
        shuffle=True,
        verbose=1,
    )
    phase1_duration = time.time() - start
    print(f"\n[OK] Phase 1 selesai dalam {phase1_duration / 60:.1f} menit")

    # ─── Phase 2: Fine-tuning (unfreeze backbone, train all) ───
    print("\n" + "═" * 60)
    print("[PHASE 2] FINE-TUNE — unfreeze backbone, train all layers")
    print("═" * 60)

    # Unfreeze backbone
    backbone = inference_model.get_layer("mobilenet_v3_backbone")
    backbone.trainable = True
    trainable_params = sum([tf.size(w).numpy() for w in inference_model.trainable_weights])
    print(f"  Trainable params: {trainable_params:,} (was {inference_model.count_params():,} total)")

    # Recompile dengan learning rate lebih kecil (fine-tuning)
    model.compile(optimizer=Adam(learning_rate=args.lr_finetune))

    cb_finetune = [
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
            min_lr=1e-7,
            verbose=1,
        ),
        callbacks.CSVLogger(str(output_dir / "training_finetune.csv")),
    ]

    print(f"\n[TRAIN] Phase 2 · {args.epochs_finetune} epochs · batch {args.batch} · lr {args.lr_finetune}")
    start = time.time()
    history_finetune = model.fit(
        train_inputs, train_lbl_arr,
        validation_data=(val_inputs, val_lbl_arr),
        batch_size=args.batch,
        epochs=args.epochs_finetune,
        callbacks=cb_finetune,
        shuffle=True,
        verbose=1,
    )
    phase2_duration = time.time() - start
    print(f"\n[OK] Phase 2 selesai dalam {phase2_duration / 60:.1f} menit")

    # Save final
    model.save(output_dir / "final.h5")
    inference_model.save(output_dir / "inference.h5")

    # Combine histories
    combined_history = {}
    for k, v in history_warmup.history.items():
        combined_history[f"warmup_{k}"] = [float(x) for x in v]
    for k, v in history_finetune.history.items():
        combined_history[f"finetune_{k}"] = [float(x) for x in v]
    combined_history["phase_split"] = len(list(history_warmup.history.values())[0])

    with open(output_dir / "history.json", "w") as f:
        json.dump(combined_history, f, indent=2)

    # Plot curves (combine 2 phases)
    plot_transfer_curves(history_warmup, history_finetune, output_dir / "training_curves.png")

    total_time = (phase1_duration + phase2_duration) / 60
    print(f"\n[OK] Total training: {total_time:.1f} menit")
    print(f"[OK] Saved: best_warmup.h5, best.h5 (final), inference.h5, history.json, curves")
    print(f"\nNext steps:")
    print(f"  python evaluate.py --model {output_dir}/best.h5 --data {data_dir}/test/")
    print(f"  python export_onnx.py --model {output_dir}/inference.h5 --output {output_dir}/model.onnx")


def plot_transfer_curves(history_warmup, history_finetune, output_path: Path):
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    h1 = history_warmup.history
    h2 = history_finetune.history

    # Loss curves
    e1 = list(range(len(h1.get("loss", []))))
    e2 = [len(e1) + i for i in range(len(h2.get("loss", [])))]
    axes[0].plot(e1, h1.get("loss", []), label="Phase 1: train", color="blue")
    axes[0].plot(e1, h1.get("val_loss", []), label="Phase 1: val", color="lightblue")
    axes[0].plot(e2, h2.get("loss", []), label="Phase 2: train", color="darkgreen")
    axes[0].plot(e2, h2.get("val_loss", []), label="Phase 2: val", color="lightgreen")
    if e1:
        axes[0].axvline(x=e1[-1] + 0.5, color="red", linestyle="--", alpha=0.5,
                         label="Phase 1→2")
    axes[0].set_title("Loss (Warmup → Fine-tune)")
    axes[0].set_xlabel("Epoch (cumulative)")
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)

    # Accuracy curves
    if "val_full_acc" in h1:
        axes[1].plot(e1, h1["val_full_acc"], label="Phase 1: full acc", color="blue")
    if "val_full_acc" in h2:
        axes[1].plot(e2, h2["val_full_acc"], label="Phase 2: full acc", color="darkgreen")
    if "val_char_acc" in h1:
        axes[1].plot(e1, h1["val_char_acc"], label="Phase 1: char acc", color="lightblue", alpha=0.6)
    if "val_char_acc" in h2:
        axes[1].plot(e2, h2["val_char_acc"], label="Phase 2: char acc", color="lightgreen", alpha=0.6)
    axes[1].axhline(y=config.TARGET_FULL_ACC, color="red", linestyle="--", alpha=0.5, label=f"target {config.TARGET_FULL_ACC:.0%}")
    if e1:
        axes[1].axvline(x=e1[-1] + 0.5, color="red", linestyle="--", alpha=0.3)
    axes[1].set_title("Validation Accuracy")
    axes[1].set_xlabel("Epoch (cumulative)")
    axes[1].set_ylim(0, 1)
    axes[1].legend()
    axes[1].grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(output_path, dpi=120)
    plt.close()


def main():
    parser = argparse.ArgumentParser(description="Train CRNN with transfer learning (MobileNetV3 ImageNet)")
    parser.add_argument("--data", type=str, default=str(config.PREPARED_DIR))
    parser.add_argument("--output", type=str, default=str(config.MODELS_DIR / "cnn_transfer_v1"))
    parser.add_argument("--epochs-warmup", type=int, default=10,
                        help="Epoch dengan backbone frozen (Phase 1)")
    parser.add_argument("--epochs-finetune", type=int, default=30,
                        help="Epoch dengan backbone unfrozen (Phase 2)")
    parser.add_argument("--batch", type=int, default=config.BATCH_SIZE)
    parser.add_argument("--lr-warmup", type=float, default=1e-3,
                        help="Learning rate Phase 1 (head training)")
    parser.add_argument("--lr-finetune", type=float, default=1e-4,
                        help="Learning rate Phase 2 (lebih kecil untuk fine-tune backbone)")
    args = parser.parse_args()
    train(args)


if __name__ == "__main__":
    main()
