// Round 39 (R31 di codebase) — NON-DESTRUCTIVE fallback untuk image copy.png
// pocket scale 3.72g. Preserve iter140 R28 EXACT, hanya fire iter149 fallback
// kalau iter140 hasilkan null.

import * as ImageManipulator from "expo-image-manipulator";
import TextRecognition from "../lib/textRecognition";
import {
  iter136_jpegBaseline,
  iter137_pngBaseline,
  iter138_bboxPng,
  iter139_multiRes,
  iter140_tunedTrimMega,
} from "./r35-tuned-trim";

const NUMBER_RX = /-?\d{1,5}(?:[.,]\d{1,3})?/;
const LABEL_TOKENS = /\b(mode|tare|on\/?off|unit|set|press|hold|kitchen|scale|battery|low|empty|temp|m\+|tot|net|zero)\b/i;

function timed(fn) {
  return async (...args) => {
    const t0 = Date.now();
    const result = await fn(...args);
    return { ...result, ms: Date.now() - t0 };
  };
}

async function manipulate(uri, actions, options = {}) {
  return ImageManipulator.manipulateAsync(uri, actions, {
    compress: options.compress ?? 0.9,
    format: options.format ?? ImageManipulator.SaveFormat.JPEG,
  });
}

function frameArea(f) {
  if (!f) return 100;
  return Math.max(1, (f.width ?? 1) * (f.height ?? 1));
}

function extractAllCandidates(blocks) {
  const out = [];
  for (const block of blocks ?? []) {
    for (const line of block.lines ?? []) {
      const text = (line.text ?? "").trim();
      if (!text) continue;
      const frame = line.frame ?? block.frame ?? null;
      const digits = (text.match(/\d/g) ?? []).length;
      const labelTaint = LABEL_TOKENS.test(text);
      const m = text.match(NUMBER_RX);
      if (m && !labelTaint) {
        const num = parseFloat(m[0].replace(",", "."));
        const digitStr = m[0].replace(/[^\d]/g, "");
        out.push({
          text, digits, labelTaint, frame, rawValue: num, digitStr,
          hasDot: m[0].includes(".") || m[0].includes(","),
        });
      }
    }
  }
  return out;
}

function detectUnitInText(text) {
  if (/\bkg\b|kilogram/i.test(text)) return "kg";
  if (/\boz\b|ounce/i.test(text)) return "oz";
  if (/\b(?:^|[^a-z])g\b|gram/i.test(text)) return "g";
  return null;
}

async function ocrLines(uri) {
  const r = await TextRecognition.recognize(uri);
  const text = (r?.text ?? "");
  const lines = extractAllCandidates(r?.blocks);
  return { text, lines };
}

// =============================================================================
// Iter 149: AGGRESSIVE RECOVERY untuk fallback saat iter140 null
//
// Strategi tier:
//   1. JPEG roundtrip Q=0.1 → re-save Q=0.9 → upscale 6x (artifact bleed)
//   2. PNG super-upscale 6x dari original (preserve quality)
//   3. ROI center crop 60% (focus on display, skip label noise)
// Pilih candidate dengan digit count terbanyak.
// =============================================================================
export const iter149_aggressiveRecovery = timed(async (uri) => {
  const candidates = [];

  // Variant 1: JPEG roundtrip artifact bleed
  try {
    const lossy = await manipulate(uri, [{ resize: { width: 800 } }], { compress: 0.1 });
    const cleaned = await manipulate(lossy.uri, [{ resize: { width: 4800 } }], { compress: 0.9 });
    const { text, lines } = await ocrLines(cleaned.uri);
    if (lines.length) candidates.push({ ...lines.sort((a, b) => b.digits - a.digits)[0], variant: "jpeg_roundtrip", srcText: text });
  } catch {}

  // Variant 2: PNG super-upscale 6x
  try {
    const upscaled = await manipulate(uri, [{ resize: { width: 3840 } }], {
      format: ImageManipulator.SaveFormat.PNG,
    });
    const { text, lines } = await ocrLines(upscaled.uri);
    if (lines.length) candidates.push({ ...lines.sort((a, b) => b.digits - a.digits)[0], variant: "png_6x", srcText: text });
  } catch {}

  // Variant 3: ROI center crop 60% × upscale
  try {
    const sized = await manipulate(uri, [{ resize: { width: 1280 } }]);
    const meta = sized;
    if (meta.width && meta.height) {
      const cropW = meta.width * 0.6;
      const cropH = meta.height * 0.5;
      const crop = {
        originX: (meta.width - cropW) / 2,
        originY: (meta.height - cropH) / 2,
        width: cropW,
        height: cropH,
      };
      const cropped = await manipulate(sized.uri, [
        { crop },
        { resize: { width: 2400 } },
      ], { format: ImageManipulator.SaveFormat.PNG });
      const { text, lines } = await ocrLines(cropped.uri);
      if (lines.length) candidates.push({ ...lines.sort((a, b) => b.digits - a.digits)[0], variant: "center_crop", srcText: text });
    }
  } catch {}

  if (candidates.length === 0) {
    return { iter: 149, method: "aggressive_recovery", raw: "no candidates", value: null, unit: null };
  }

  // Pilih candidate dengan digits terbanyak (likely paling mendekati GT digit string)
  candidates.sort((a, b) => b.digits - a.digits);
  const best = candidates[0];
  return {
    iter: 149, method: "aggressive_recovery",
    raw: `${best.variant}:${best.srcText.slice(0, 60)}`,
    value: best.rawValue,
    unit: detectUnitInText(best.srcText),
  };
});

// =============================================================================
// Iter 150: SMART CHOOSER — preserve iter140 hasil R28, hanya replace kalau null
// =============================================================================
export const iter150_smartChooser = timed(async (i140, i149, priorIters) => {
  // NON-DESTRUCTIVE: kalau iter140 punya value, pakai iter140 (R28 EXACT preserve).
  if (i140?.value != null) {
    return {
      iter: 150, method: "smart_chooser",
      raw: `passthrough iter140 value=${i140.value}`,
      value: i140.value,
      unit: i140.unit,
    };
  }
  // Fallback: kalau iter140 null, coba iter149 aggressive recovery
  if (i149?.value != null) {
    // Apply decimal heuristic untuk pocket scale (3-4 digit kecil)
    const v = i149.value;
    const digits = String(Math.round(Math.abs(v)));
    // Pocket scale typical: XYZ → X.YZ (e.g. 372 → 3.72)
    if (digits.length === 3 && !String(v).includes(".")) {
      const placed = parseFloat(`${digits[0]}.${digits.slice(1)}`);
      if (placed >= 0.1 && placed <= 9.99) {
        return {
          iter: 150, method: "smart_chooser",
          raw: `iter149 pocket_placed ${digits}→${placed}`,
          value: placed, unit: "g",
        };
      }
    }
    if (digits.length === 4 && !String(v).includes(".")) {
      const placed = parseFloat(`${digits.slice(0, 2)}.${digits.slice(2)}`);
      if (placed >= 1 && placed <= 99) {
        return {
          iter: 150, method: "smart_chooser",
          raw: `iter149 pocket_placed_4 ${digits}→${placed}`,
          value: placed, unit: "g",
        };
      }
    }
    return {
      iter: 150, method: "smart_chooser",
      raw: `iter149 fallback ${v}`,
      value: v, unit: i149.unit,
    };
  }
  return { iter: 150, method: "smart_chooser", raw: "null all", value: null, unit: null };
});

// wrap iter150 to log timing
const iter150Wrapped = timed(async (i140, i149, priorIters) => {
  const r = await iter150_smartChooser(i140, i149, priorIters);
  // r itself sudah includes ms via timed inner, tetapi outer ms = total. Pakai outer.
  return { iter: r.iter, method: r.method, raw: r.raw, value: r.value, unit: r.unit };
});

export async function runRound31Iterations(uri) {
  const i136 = await iter136_jpegBaseline(uri);
  const i137 = await iter137_pngBaseline(uri);
  const i138 = await iter138_bboxPng(uri);
  const i139 = await iter139_multiRes(uri);
  const i140 = await iter140_tunedTrimMega(uri, [i136, i137, i138, i139]);
  const i149 = await iter149_aggressiveRecovery(uri);
  const i150 = await iter150Wrapped(i140, i149, [i136, i137, i138, i139, i140, i149]);
  return [i136, i137, i138, i139, i140, i149, i150];
}
