// Round 37 (R29 di codebase) — Attack image copy 3 (LCD pasif 52.8 kg pink).
//
// Strategi: extreme zoom 2-pass deep + JPEG quality sweep (0.1/0.2) + WEBP +
// flip combinations. Preserve semua iter R28 winners sebagai foundation,
// tambahkan iter141-145 baru untuk LCD pasif attack.

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
// Iter 141: EXTREME ZOOM 2-PASS DEEP
// Pass1 detect bbox digit terbesar, Pass2 crop dengan padding besar ke kiri
// + upscale 5x (vs R28 yang 3x). Target: include digit yang hilang di kontras lemah.
// =============================================================================
export const iter141_extremeZoomDeep = timed(async (uri) => {
  const sized = await manipulate(uri, [{ resize: { width: 1280 } }]);
  const { text: p1text, lines: lines1 } = await ocrLines(sized.uri);
  const seed = lines1.filter((l) => l.digits >= 1 && !l.labelTaint)
    .sort((a, b) => b.digits * frameArea(b.frame) - a.digits * frameArea(a.frame))[0];
  if (!seed?.frame) {
    return { iter: 141, method: "extreme_zoom_deep", raw: p1text.slice(0, 100), value: null, unit: detectUnitInText(p1text) };
  }
  const f = seed.frame;
  // Padding besar ke kiri (digit hilang biasanya di sebelah kiri "8")
  const padLeft = (f.width ?? 0) * 3.0;  // 3x width ke kiri
  const padRight = (f.width ?? 0) * 0.5;
  const padY = (f.height ?? 0) * 0.6;
  const crop = {
    originX: Math.max(0, (f.x ?? 0) - padLeft),
    originY: Math.max(0, (f.y ?? 0) - padY),
    width: (f.width ?? 0) + padLeft + padRight,
    height: (f.height ?? 0) + padY * 2,
  };
  try {
    const cropped = await manipulate(sized.uri, [
      { crop },
      { resize: { width: Math.max(1200, Math.round(crop.width * 5)) } },  // upscale 5x
    ], { format: ImageManipulator.SaveFormat.PNG });
    const { text: p2text, lines: lines2 } = await ocrLines(cropped.uri);
    lines2.sort((a, b) => {
      if (a.isSubstituted !== b.isSubstituted) return a.isSubstituted ? 1 : -1;
      if (a.digits !== b.digits) return b.digits - a.digits;
      return frameArea(b.frame) - frameArea(a.frame);
    });
    const final = lines2[0] ?? seed;
    return { iter: 141, method: "extreme_zoom_deep", raw: (p2text || p1text).slice(0, 100), value: final?.rawValue ?? null, unit: detectUnitInText(p1text + " " + p2text) };
  } catch {
    return { iter: 141, method: "extreme_zoom_deep", raw: p1text.slice(0, 100), value: seed.rawValue, unit: detectUnitInText(p1text) };
  }
});

// =============================================================================
// Iter 142: JPEG QUALITY SWEEP (0.1, 0.2, 0.4 di 4 angle)
// Hipotesa: ultra-low JPEG quality menebalkan edge LCD pasif via macro-blocking.
// =============================================================================
export const iter142_jpegQualitySweep = timed(async (uri) => {
  const qualities = [0.1, 0.2, 0.4];
  const angles = [0, 90, 180, 270];
  let bestLine = null, bestText = "", bestScore = 0;
  for (const q of qualities) {
    for (const angle of angles) {
      let actions = [{ resize: { width: 1280 } }];
      if (angle !== 0) actions = [{ rotate: angle }, ...actions];
      try {
        const img = await manipulate(uri, actions, { compress: q });
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
  }
  return { iter: 142, method: "jpeg_quality_sweep", raw: bestText.slice(0, 100), value: bestLine?.rawValue ?? null, unit: detectUnitInText(bestText) };
});

// =============================================================================
// Iter 143: WEBP LOSSY ARTIFACT
// Hipotesa: WEBP encoding artifact berbeda dari JPEG, mungkin LCD pink jadi lebih kontras.
// =============================================================================
export const iter143_webpArtifact = timed(async (uri) => {
  const qualities = [0.3, 0.5];
  const angles = [0, 90, 180, 270];
  let bestLine = null, bestText = "", bestScore = 0;
  for (const q of qualities) {
    for (const angle of angles) {
      let actions = [{ resize: { width: 1280 } }];
      if (angle !== 0) actions = [{ rotate: angle }, ...actions];
      try {
        const img = await manipulate(uri, actions, {
          compress: q,
          format: ImageManipulator.SaveFormat.WEBP,
        });
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
  }
  return { iter: 143, method: "webp_artifact", raw: bestText.slice(0, 100), value: bestLine?.rawValue ?? null, unit: detectUnitInText(bestText) };
});

// =============================================================================
// Iter 144: FLIP COMBINATIONS (8 orientations)
// Hipotesa: MLKit bias scanning, flip bisa unlock digit hidden.
// =============================================================================
export const iter144_flipCombos = timed(async (uri) => {
  const flipModes = [
    { name: "0", actions: [] },
    { name: "fh", actions: [{ flip: ImageManipulator.FlipType.Horizontal }] },
    { name: "fv", actions: [{ flip: ImageManipulator.FlipType.Vertical }] },
    { name: "fh+r90", actions: [{ flip: ImageManipulator.FlipType.Horizontal }, { rotate: 90 }] },
    { name: "fv+r90", actions: [{ flip: ImageManipulator.FlipType.Vertical }, { rotate: 90 }] },
  ];
  let bestLine = null, bestText = "", bestScore = 0;
  for (const mode of flipModes) {
    const actions = [...mode.actions, { resize: { width: 1280 } }];
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
      // Flip results need to be flipped back conceptually — digit value sama
      if (score > bestScore) { bestScore = score; bestText = text; bestLine = best; }
    } catch {}
  }
  return { iter: 144, method: "flip_combos", raw: bestText.slice(0, 100), value: bestLine?.rawValue ?? null, unit: detectUnitInText(bestText) };
});

// =============================================================================
// Iter 145: MEGA VOTER v2 — aggregate iter136-144 with trim variant logic
// Same vote logic sebagai iter140 tapi sumber lebih banyak (9 vs 4).
// =============================================================================
export const iter145_megaVoterV2 = timed(async (uri, priorIters) => {
  const allRaw = (priorIters ?? [])
    .filter((it) => it.value != null)
    .map((it) => ({
      source: `iter${it.iter}`,
      value: it.value,
      digitStr: String(Math.round(Math.abs(it.value))),
      unit: it.unit,
      raw: it.raw ?? "",
    }));

  if (allRaw.length === 0) {
    return { iter: 145, method: "mega_voter_v2", raw: "no priors", value: null, unit: null };
  }

  const expanded = [];
  for (const c of allRaw) {
    expanded.push({ ...c, variant: "original" });
    if (c.digitStr.length === 5) {
      expanded.push({ ...c, digitStr: c.digitStr.slice(0, 4), variant: "dropLast5to4" });
    }
  }

  const sceneText = priorIters.map((it) => it.raw ?? "").join(" ");
  const explicitScaleType = inferScaleTypeFromScene(sceneText);
  const unitVotes = {};
  for (const c of expanded) {
    if (c.unit) unitVotes[c.unit] = (unitVotes[c.unit] ?? 0) + 1;
  }
  const sceneUnit = detectUnitInText(sceneText);
  if (sceneUnit) unitVotes[sceneUnit] = (unitVotes[sceneUnit] ?? 0) + 2;
  const inferredUnit = Object.entries(unitVotes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const candidateScaleTypes = ["body_kg", "kitchen_kg", "pocket_g", "kitchen_g"];
  const allScored = [];
  for (const scaleType of candidateScaleTypes) {
    for (const c of expanded) {
      const placed = applyDecimalStrategy(c.digitStr, scaleType, parseFloat(c.digitStr), false);
      for (const p of placed) {
        let weight = p.score;
        if (explicitScaleType && scaleType === explicitScaleType) weight *= 5;
        if (inferredUnit === "kg" && scaleType.endsWith("_kg")) weight *= 2;
        if (inferredUnit === "g" && (scaleType === "kitchen_g" || scaleType === "pocket_g")) weight *= 2;
        if (!explicitScaleType && !inferredUnit) {
          if (c.digitStr.length === 3 && scaleType === "body_kg") weight *= 1.5;
          if (c.digitStr.length === 4) {
            if (scaleType === "kitchen_kg") weight *= 1.3;
            if (scaleType === "body_kg") weight *= 1.2;
          }
          if (c.digitStr.length === 5 && scaleType === "body_kg") weight *= 1.5;
        }
        if (String(p.value).includes(".")) weight *= 1.2;

        // Tuned trim variant (carry-over dari iter140)
        if (c.variant === "dropLast5to4" && scaleType === "body_kg") {
          const sv = String(p.value);
          const dotIdx = sv.indexOf(".");
          const fracDigits = dotIdx >= 0 ? sv.length - dotIdx - 1 : 0;
          if (fracDigits === 2) weight *= 2.5;
          else weight *= 0.8;
        }
        if (c.variant === "original" && c.digitStr.length === 5 && scaleType === "body_kg") {
          const sv = String(p.value);
          const dotIdx = sv.indexOf(".");
          const fracDigits = dotIdx >= 0 ? sv.length - dotIdx - 1 : 0;
          if (fracDigits === 3) weight *= 0.7;
        }

        // Source weighting: R37 newcomers (141-144) sedikit lebih rendah dari R28 proven
        if (c.source === "iter136") weight *= 1.3;
        if (c.source === "iter137") weight *= 1.3;
        if (c.source === "iter138") weight *= 1.2;
        if (c.source === "iter141") weight *= 1.4;  // extreme zoom = high trust untuk LCD pasif
        if (c.source === "iter142") weight *= 1.2;
        if (c.source === "iter143") weight *= 1.1;
        if (c.source === "iter144") weight *= 1.0;

        allScored.push({ source: c.source, scaleType, value: p.value, weight, variant: c.variant });
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
  console.log(`[iter145] explicit=${explicitScaleType} unit=${inferredUnit} raws=${allRaw.map((c) => c.value).join(",")} pick=${pick}`);
  return {
    iter: 145, method: "mega_voter_v2",
    raw: `explicit=${explicitScaleType || "?"} pick=${pick}`,
    value: pick, unit: inferredUnit,
  };
});

export async function runRound29Iterations(uri) {
  const i136 = await iter136_jpegBaseline(uri);
  const i137 = await iter137_pngBaseline(uri);
  const i138 = await iter138_bboxPng(uri);
  const i139 = await iter139_multiRes(uri);
  const i141 = await iter141_extremeZoomDeep(uri);
  const i142 = await iter142_jpegQualitySweep(uri);
  const i143 = await iter143_webpArtifact(uri);
  const i144 = await iter144_flipCombos(uri);
  const i145 = await iter145_megaVoterV2(uri, [i136, i137, i138, i139, i141, i142, i143, i144]);
  return [i136, i137, i138, i139, i141, i142, i143, i144, i145];
}
