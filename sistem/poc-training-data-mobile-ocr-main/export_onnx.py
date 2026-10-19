"""
Export trained Keras model → ONNX untuk deploy ke browser via onnxruntime-web.

Usage:
  python export_onnx.py --model models/cnn_v1/best.h5 --output models/cnn_v1/model.onnx

Output:
  - model.onnx              (untuk POC PWA, copy ke poc/public/models/)
  - onnx_validation.json    (verify Keras vs ONNX produce identical output)
"""

import argparse
import json
import time
from pathlib import Path

import numpy as np
import tensorflow as tf
from tensorflow.keras import models

import config
from train import CTCLayer, build_model
from tensorflow.keras import layers, Input, Model


def build_inference_model_unrolled():
    """Build inference model dengan LSTM unrolled — ONNX-friendly, no CuDNN ops.
    Pakai untuk export. Weights di-copy dari trained model.
    Sequence length fixed 64 (sesuai output CNN).
    """
    image_input = Input(
        shape=(config.IMG_HEIGHT, config.IMG_WIDTH, 1),
        name="image",
        dtype="float32",
    )

    x = image_input
    for i, filters in enumerate(config.CNN_FILTERS):
        x = layers.Conv2D(filters, 3, padding="same", name=f"conv_{i}")(x)
        x = layers.BatchNormalization(name=f"bn_{i}")(x)
        x = layers.Activation("relu", name=f"relu_{i}")(x)
        if i in (0, 1):
            x = layers.MaxPool2D(2, name=f"pool_{i}")(x)
        elif i in (3, 5):
            x = layers.MaxPool2D((1, 2), name=f"pool_{i}")(x)

    import tensorflow as tf
    shape = tf.keras.backend.int_shape(x)
    _, H, W, C = shape
    x = layers.Reshape((W, H * C), name="reshape")(x)
    x = layers.Dense(config.LSTM_UNITS, activation="relu", name="fc_pre_lstm")(x)
    x = layers.Dropout(config.DROPOUT, name="dropout_pre_lstm")(x)

    # KEY: unroll=True converts LSTM ke individual ops (matmul + add + sigmoid + tanh)
    # — no CuDNN ops di graph → ONNX-exportable.
    # Trade-off: slightly slower training (we don't use this for training, only export).
    x = layers.Bidirectional(
        layers.LSTM(config.LSTM_UNITS, return_sequences=True, unroll=True, use_cudnn=False),
        name="bilstm_1",
    )(x)
    x = layers.Dropout(config.DROPOUT, name="dropout_1")(x)
    x = layers.Bidirectional(
        layers.LSTM(config.LSTM_UNITS, return_sequences=True, unroll=True, use_cudnn=False),
        name="bilstm_2",
    )(x)
    x = layers.Dropout(config.DROPOUT, name="dropout_2")(x)
    output = layers.Dense(config.NUM_CLASSES + 1, activation="softmax", name="output")(x)

    return Model(inputs=image_input, outputs=output)


# Backwards-compat alias
build_inference_model = build_inference_model_unrolled


def export(args):
    model_path = Path(args.model)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print("─" * 60)
    print("ANALISA TIMBANG · ONNX Export")
    print("─" * 60)

    # ─── Load trained model & rebuild dengan LSTM unrolled (ONNX-friendly) ───
    # Strategi:
    #   1. Load trained inference.h5 (atau training best.h5)
    #   2. Build NEW inference model dengan unroll=True (no CuDNN ops)
    #   3. Copy semua weights — layer names match
    print(f"\n[LOAD] {model_path}")
    try:
        source_model = models.load_model(model_path, compile=False)
        if len(source_model.inputs) > 1:
            raise ValueError("Multi-input model — coba load training best.h5")
        is_inference = True
    except Exception:
        print(f"  Loading sebagai training model (with CTC layer)...")
        source_model = models.load_model(model_path, custom_objects={"CTCLayer": CTCLayer}, compile=False)
        is_inference = False

    print(f"  Source model loaded · {source_model.count_params():,} params")
    print(f"\n[REBUILD] Inference model dengan LSTM unrolled (ONNX-friendly)")
    inference_model = build_inference_model_unrolled()

    # Copy weights by layer name
    n_copied = 0
    for layer in inference_model.layers:
        try:
            source_layer = source_model.get_layer(layer.name)
            weights = source_layer.get_weights()
            if weights:
                layer.set_weights(weights)
                n_copied += 1
        except Exception as e:
            if layer.weights:
                print(f"  WARN: failed copy weights for {layer.name}: {e}")

    print(f"  Copied weights for {n_copied} layers")

    # ─── Convert ke ONNX ───
    try:
        import tf2onnx
    except ImportError:
        raise SystemExit("tf2onnx tidak terinstall. Run: pip install tf2onnx")

    print(f"\n[EXPORT] → {output_path}")
    spec = (tf.TensorSpec(
        (None, config.IMG_HEIGHT, config.IMG_WIDTH, config.IMG_CHANNELS),
        tf.float32, name="image",
    ),)
    model_proto, _ = tf2onnx.convert.from_keras(
        inference_model,
        input_signature=spec,
        opset=13,
        output_path=str(output_path),
    )
    print(f"  ONNX file: {output_path} ({output_path.stat().st_size / 1024:.1f} KB)")

    # ─── Validation: Keras vs ONNX output identical? ───
    try:
        import onnxruntime as ort
    except ImportError:
        print("[SKIP] onnxruntime tidak terinstall — skip validation")
        return

    print(f"\n[VALIDATE] Keras vs ONNX")
    sess = ort.InferenceSession(str(output_path), providers=["CPUExecutionProvider"])
    onnx_input_name = sess.get_inputs()[0].name

    # Generate dummy input
    np.random.seed(config.SEED)
    dummy = np.random.rand(2, config.IMG_HEIGHT, config.IMG_WIDTH, config.IMG_CHANNELS).astype(np.float32)

    # Keras inference
    t0 = time.time()
    keras_out = inference_model.predict(dummy, verbose=0)
    keras_ms = (time.time() - t0) * 1000

    # ONNX inference
    t0 = time.time()
    onnx_out = sess.run(None, {onnx_input_name: dummy})[0]
    onnx_ms = (time.time() - t0) * 1000

    # Compare
    max_diff = float(np.max(np.abs(keras_out - onnx_out)))
    mean_diff = float(np.mean(np.abs(keras_out - onnx_out)))
    print(f"  Max diff: {max_diff:.6e}")
    print(f"  Mean diff: {mean_diff:.6e}")
    print(f"  Keras inference: {keras_ms:.1f} ms")
    print(f"  ONNX inference:  {onnx_ms:.1f} ms")

    is_valid = max_diff < 1e-4
    print(f"  Validation: {'✅ PASS' if is_valid else '❌ FAIL — outputs berbeda significantly'}")

    # Save validation report
    report = {
        "model": str(model_path),
        "onnx": str(output_path),
        "onnx_size_kb": output_path.stat().st_size / 1024,
        "max_diff": max_diff,
        "mean_diff": mean_diff,
        "keras_inference_ms": keras_ms,
        "onnx_inference_ms": onnx_ms,
        "valid": is_valid,
    }
    report_path = output_path.parent / "onnx_validation.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\n[OK] Report saved → {report_path}")

    if is_valid:
        print(f"\nNext step:")
        print(f"  1. Copy ONNX ke POC: cp {output_path} ../poc/public/models/cnn_v1.onnx")
        print(f"  2. Update POC src/lib/ocr.ts untuk pakai onnxruntime-web")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--output", default="models/cnn_v1/model.onnx")
    args = parser.parse_args()
    export(args)


if __name__ == "__main__":
    main()
