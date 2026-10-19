// Round 30 (R24 di codebase) — Production-Ready Lean Pipeline.
//
// Optimasi: hanya 5 iter, focus 3 yang paling reliable + 2 backup.
// Target: <3s/gambar dengan akurasi 4-5/7 stable.

import * as ImageManipulator from "expo-image-manipulator";
import TextRecognition from "../lib/textRecognition";

const NUMBER_RX = /-?\d{1,5}(?:[.,]\d{1,3})?/;
const LABEL_TOKENS = /\b(mode|tare|on\/?off|unit|set|press|hold|kitchen|scale|battery|low|empty|temp|m\+|tot|net|zero)\b/i;
const LETTER_TO_DIGIT_SAFE = {
  O: "0", o: "0", L: "1", l: "1", I: "1", i: "1", Z: "2", z: "2", T: "7", t: "7", B: "8",
};

function substituteLettersToDigitsSafe(text) {
  if (!text || text.length < 2) return text;
  return text.split("").map((c) => LETTER_TO_DIGIT_SAFE[c] ?? c).join("");
}

const DECIMAL_STRATEGY = {
  body_kg: {
    2: [{ at: null, min: 1, max: 99 }],
    3: [{ at: 2, min: 20, max: 200 }, { at: 1, min: 1, max: 99 }],
    4: [{ at: 2, min: 30, max: 200 }, { at: 3, min: 100, max: 999 }, { at: 1, min: 1, max: 30 }],
    5: [{ at: 2, min: 20, max: 200 }, { at: 3, min: 100, max: 999 }],
  },
  kitchen_kg: {
    3: [{ at: 1, min: 0.1, max: 10 }],
    4: [{ at: 1, min: 0.1, max: 10 }, { at: 0, min: 0.001, max: 1 }],
    5: [{ at: 2, min: 0.1, max: 100 }],
  },
  kitchen_g: {
    2: [{ at: null, min: 1, max: 99 }],
    3: [{ at: null, min: 1, max: 999 }, { at: 2, min: 1, max: 99.9 }],
    4: [{ at: null, min: 100, max: 9999 }, { at: 2, min: 1, max: 99.99 }],
  },
  pocket_g: {
    3: [{ at: 1, min: 0.1, max: 9.99 }],
    4: [{ at: 2, min: 1, max: 99.99 }, { at: 1, min: 0.1, max: 9.999 }],
  },
};

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
      const letters = (text.match(/[a-zA-Z]/g) ?? []).length;
      const labelTaint = LABEL_TOKENS.test(text);
      const m = text.match(NUMBER_RX);
      if (m && !labelTaint) {
        const num = parseFloat(m[0].replace(",", "."));
        const digitStr = m[0].replace(/[^\d]/g, "");
        out.push({
          text, source: "direct", digits, letters, labelTaint,
          frame, rawValue: num, digitStr,
          hasDot: m[0].includes(".") || m[0].includes(","),
          isSubstituted: false,
        });
      }
      if (!labelTaint && letters >= 2) {
        const subbed = substituteLettersToDigitsSafe(text);
        const m2 = subbed.match(NUMBER_RX);
        if (m2 && m2[0].length >= 2) {
          const subDigits = m2[0].replace(/[^\d]/g, "").length;
          if (subDigits >= 2 && subDigits > (m ? m[0].replace(/[^\d]/g, "").length : 0)) {
            const num = parseFloat(m2[0].replace(",", "."));
            const digitStr = m2[0].replace(/[^\d]/g, "");
            out.push({
              text: `${text}→${subbed}`, source: "letter_sub", digits: digitStr.length, letters: 0,
              labelTaint, frame, rawValue: num, digitStr,
              hasDot: m2[0].includes(".") || m2[0].includes(","),
              isSubstituted: true,
            });
          }
        }
      }
    }
  }
  return out;
}

function applyDecimalStrategy(digitStr, scaleType, originalValue, hasDot) {
  if (hasDot) return [{ value: originalValue, score: 10 }];
  const strategy = DECIMAL_STRATEGY[scaleType]?.[digitStr.length] ?? [];
  const out = [];
  strategy.forEach((s, i) => {
    let v;
    if (s.at === null) v = parseFloat(digitStr);
    else if (s.at === 0) v = parseFloat(`0.${digitStr}`);
    else v = parseFloat(`${digitStr.slice(0, s.at)}.${digitStr.slice(s.at)}`);
    if (v >= s.min && v <= s.max) {
      out.push({ value: v, score: strategy.length - i });
    }
  });
  if (out.length === 0) out.push({ value: originalValue, score: 0.5 });
  return out;
}

function inferScaleTypeFromScene(sceneText) {
  const maxMatch = sceneText.match(/max[:\s.]+(\d{2,5})\s*g/i);
  if (maxMatch) {
    const maxG = parseInt(maxMatch[1]);
    if (maxG <= 500) return "pocket_g";
    return "kitchen_g";
  }
  if (/\b(gram|gr)\b/i.test(sceneText) && !/kilogram/i.test(sceneText)) return "kitchen_kg";
  if (/kitchen scale|10000g|5000g/i.test(sceneText)) return "kitchen_g";
  if (/\b(tare|mode|on\/?off)\b/i.test(sceneText)) return "pocket_g";
  if (/\bkg\b|kilogram/i.test(sceneText)) return "body_kg";
  return null;
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
// Iter 116: JPEG compress×rotate compact (R18 lean — only quality 0.3 + 4 angles)
// =============================================================================
export const iter116_compactJpeg = timed(async (uri) => {
  const angles = [0, 90, 180, 270];
  let bestLine = null, bestText = "", bestScore = 0;
  for (const angle of angles) {
    let actions = [{ resize: { width: 1280 } }];
    if (angle !== 0) actions = [{ rotate: angle }, ...actions];
    try {
      const img = await manipulate(uri, actions, { compress: 0.3 });
      const { text, lines } = await ocrLines(img.uri);
      let score = 0, best = null;
      for (const l of lines) {
        if (l.labelTaint) continue;
        const subPenalty = l.isSubstituted ? 0.5 : 1;
        const s = l.digits * (1 + 0.0001 * frameArea(l.frame)) * subPenalty;
        score += s;
        if (s > (best ? best.digits * (best.isSubstituted ? 0.5 : 1) : 0)) best = l;
      }
      if (score > bestScore) { bestScore = score; bestText = text; bestLine = best; }
    } catch {}
  }
  return {
    iter: 116, method: "compact_jpeg",
    raw: bestText.slice(0, 100), value: bestLine?.rawValue ?? null,
    unit: detectUnitInText(bestText),
  };
});

// =============================================================================
// Iter 117: PNG rotate compact
// =============================================================================
export const iter117_compactPng = timed(async (uri) => {
  const angles = [0, 90, 180, 270];
  let bestLine = null, bestText = "", bestScore = 0;
  for (const angle of angles) {
    let actions = [{ resize: { width: 1280 } }];
    if (angle !== 0) actions = [{ rotate: angle }, ...actions];
    try {
      const img = await manipulate(uri, actions, { format: ImageManipulator.SaveFormat.PNG });
      const { text, lines } = await ocrLines(img.uri);
      let score = 0, best = null;
      for (const l of lines) {
        if (l.labelTaint) continue;
        const subPenalty = l.isSubstituted ? 0.5 : 1;
        const s = l.digits * (1 + 0.0001 * frameArea(l.frame)) * subPenalty;
        score += s;
        if (s > (best ? best.digits * (best.isSubstituted ? 0.5 : 1) : 0)) best = l;
      }
      if (score > bestScore) { bestScore = score; bestText = text; bestLine = best; }
    } catch {}
  }
  return {
    iter: 117, method: "compact_png",
    raw: bestText.slice(0, 100), value: bestLine?.rawValue ?? null,
    unit: detectUnitInText(bestText),
  };
});

// =============================================================================
// Iter 118: Multi-resolution lean (2 res only)
// =============================================================================
export const iter118_multiResLean = timed(async (uri) => {
  const widths = [1280, 1920];
  const allLines = [];
  let aggregateText = "";
  for (const w of widths) {
    const img = await manipulate(uri, [{ resize: { width: w } }]);
    const { text, lines } = await ocrLines(img.uri);
    aggregateText += " " + text;
    for (const l of lines) allLines.push({ ...l, source: `res${w}` });
  }
  const candidates = allLines.filter((l) => l.digits >= 1 && !l.labelTaint)
    .sort((a, b) => b.digits * frameArea(b.frame) - a.digits * frameArea(a.frame));
  return {
    iter: 118, method: "multi_res_lean",
    raw: aggregateText.slice(0, 100),
    value: candidates[0]?.rawValue ?? null,
    unit: detectUnitInText(aggregateText),
  };
});

// =============================================================================
// Iter 119: Bbox two-pass PNG (R25 winner)
// =============================================================================
export const iter119_pngBboxTwoPass = timed(async (uri) => {
  const sized = await manipulate(uri, [{ resize: { width: 1280 } }]);
  const { text: p1text, lines: lines1 } = await ocrLines(sized.uri);
  const seed = lines1.filter((l) => l.digits >= 1)
    .sort((a, b) => b.digits * frameArea(b.frame) - a.digits * frameArea(a.frame))[0];
  if (!seed?.frame) {
    return { iter: 119, method: "png_bbox_two_pass", raw: p1text.slice(0, 100), value: seed?.rawValue ?? null, unit: detectUnitInText(p1text) };
  }
  const f = seed.frame;
  const padX = (f.width ?? 0) * 0.15;
  const padY = (f.height ?? 0) * 0.5;
  const crop = {
    originX: Math.max(0, (f.x ?? 0) - padX),
    originY: Math.max(0, (f.y ?? 0) - padY),
    width: (f.width ?? 0) + padX * 2,
    height: (f.height ?? 0) + padY * 2,
  };
  let cropped;
  try {
    cropped = await manipulate(sized.uri, [{ crop }, { resize: { width: Math.max(800, Math.round(crop.width * 3)) } }], { format: ImageManipulator.SaveFormat.PNG });
  } catch {
    return { iter: 119, method: "png_bbox_two_pass", raw: p1text.slice(0, 100), value: seed?.rawValue ?? null, unit: detectUnitInText(p1text) };
  }
  const { text: p2text, lines: lines2 } = await ocrLines(cropped.uri);
  lines2.sort((a, b) => {
    if (a.isSubstituted !== b.isSubstituted) return a.isSubstituted ? 1 : -1;
    if (a.digits !== b.digits) return b.digits - a.digits;
    return frameArea(b.frame) - frameArea(a.frame);
  });
  const final = lines2[0] ?? seed;
  return {
    iter: 119, method: "png_bbox_two_pass",
    raw: (p2text || p1text).slice(0, 100),
    value: final?.rawValue ?? null,
    unit: detectUnitInText(p1text + " " + p2text),
  };
});

// =============================================================================
// Iter 120: PRODUCTION mega ensemble — balanced & lean
// =============================================================================
export const iter120_prodMega = timed(async (uri, priorIters) => {
  const allRaw = (priorIters ?? [])
    .filter((it) => it.value != null)
    .map((it) => ({
      source: `iter${it.iter}`,
      value: it.value,
      digitCount: String(Math.round(Math.abs(it.value))).length,
      unit: it.unit,
      raw: it.raw ?? "",
    }));

  if (allRaw.length === 0) {
    return { iter: 120, method: "prod_mega", raw: "no priors", value: null, unit: null };
  }

  const sceneText = priorIters.map((it) => it.raw ?? "").join(" ");
  const explicitScaleType = inferScaleTypeFromScene(sceneText);
  const maxDigits = Math.max(...allRaw.map((c) => c.digitCount));
  let filtered = allRaw;
  if (maxDigits >= 2) filtered = allRaw.filter((c) => c.digitCount >= 2);

  const unitVotes = {};
  for (const it of filtered) {
    if (it.unit) unitVotes[it.unit] = (unitVotes[it.unit] ?? 0) + 1;
  }
  const sceneUnit = detectUnitInText(sceneText);
  if (sceneUnit) unitVotes[sceneUnit] = (unitVotes[sceneUnit] ?? 0) + 2;
  const inferredUnit = Object.entries(unitVotes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const candidateScaleTypes = ["body_kg", "kitchen_kg", "pocket_g", "kitchen_g"];
  const allScored = [];
  for (const scaleType of candidateScaleTypes) {
    for (const c of filtered) {
      const digitStr = String(Math.round(Math.abs(c.value))).replace(/^0+/, "") || "0";
      const hasDot = String(c.value).includes(".");
      const placed = applyDecimalStrategy(digitStr, scaleType, c.value, hasDot);
      for (const p of placed) {
        let weight = p.score;
        if (explicitScaleType && scaleType === explicitScaleType) weight *= 5;
        if (inferredUnit === "kg" && scaleType.endsWith("_kg")) weight *= 2;
        if (inferredUnit === "g" && (scaleType === "kitchen_g" || scaleType === "pocket_g")) weight *= 2;
        if (!explicitScaleType && !inferredUnit) {
          if (digitStr.length === 3 && scaleType === "body_kg") weight *= 1.5;
          if (digitStr.length === 4) {
            if (scaleType === "kitchen_kg") weight *= 1.3;
            if (scaleType === "body_kg") weight *= 1.2;
          }
          if (digitStr.length === 5 && scaleType === "body_kg") weight *= 1.5;
        }
        if (String(p.value).includes(".")) weight *= 1.2;
        if (c.source === "iter116") weight *= 1.3;  // JPEG winning
        if (c.source === "iter117") weight *= 1.3;  // PNG winning
        if (c.source === "iter119") weight *= 1.3;  // PNG bbox
        allScored.push({ source: c.source, scaleType, value: p.value, weight });
      }
    }
  }

  const tally = new Map();
  for (const s of allScored) {
    const k = s.value.toFixed(4);
    tally.set(k, (tally.get(k) ?? 0) + s.weight);
  }
  const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  const pick = sorted[0] ? parseFloat(sorted[0][0]) : null;
  console.log(`[iter120] explicit=${explicitScaleType} unit=${inferredUnit} raws=${allRaw.map((c) => c.value).join(",")} pick=${pick}`);
  return {
    iter: 120, method: "prod_mega",
    raw: `explicit=${explicitScaleType || "?"} pick=${pick}`,
    value: pick, unit: inferredUnit,
  };
});

export async function runRound24Iterations(uri) {
  const i116 = await iter116_compactJpeg(uri);
  const i117 = await iter117_compactPng(uri);
  const i118 = await iter118_multiResLean(uri);
  const i119 = await iter119_pngBboxTwoPass(uri);
  const i120 = await iter120_prodMega(uri, [i116, i117, i118, i119]);
  return [i116, i117, i118, i119, i120];
}
