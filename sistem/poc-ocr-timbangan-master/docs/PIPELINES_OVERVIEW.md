# Top 7 OCR Pipelines Archive

Arsip 7 round performers terbaik (4/7 EXACT) dari 30 loop iterasi. Disimpan immutable sebagai referensi historis dan rollback option.

## 7 Top Round → 5 Unique Files

R36, R40 reuse R28 binary (passthrough verification), jadi unique pipeline files = 5.

| Round | Loop | File | Akurasi | Highlight |
|---|---|---|---|---|
| R25 | 14 | [ocrPipelinesR19.js](ocrPipelinesR19.js) | 4 EXACT | PNG lossless breakthrough (first reach image copy 7 = 50.78), unreliable di R27 |
| R30 | 19 | [ocrPipelinesR24.js](ocrPipelinesR24.js) | 3 EXACT + 1 close | Production-Lean ~3s/gambar (image copy 7 = 50.783 close) |
| **R35** ⭐ | 24 | [**ocrPipelinesR28.js**](ocrPipelinesR28.js) | **4 EXACT** | **PRODUCTION WINNER** — tuned trim variant ×2.5 boost untuk body_kg XX.YY → image copy 7 EXACT 50.78 |
| R36 | 25 | (reuse R28) | 4 EXACT | Reproducibility verify R35 |
| R37 | 26 | [ocrPipelinesR29.js](ocrPipelinesR29.js) | 4 EXACT* | LCD pasif attack (REGRESS: image copy.png jadi `7.1` wrong, sebelumnya miss). Preserve untuk historical ref. |
| R39 | 28 | [ocrPipelinesR31.js](ocrPipelinesR31.js) | 4 EXACT | Non-destructive fallback (passthrough iter140 + iter149 aggressive recovery untuk null cases) |
| R40 | 29 | (reuse R28) | 4 EXACT | Multi-run statistics 5/5 bit-identical |

*R37 punya 4 verdict non-miss tapi salah satunya wrong, lihat detail di [output/round-37-lcd-pasif-attack/analysis.md](../../output/round-37-lcd-pasif-attack/analysis.md).

## Mapping File → Round Numbering

⚠️ **Penting**: nama file pakai counter sequential (R19, R24, R28, R29, R31), tapi nama "Round" pakai loop iteration counter (R25, R30, R35, R37, R39).

| File name | Round name | Loop |
|---|---|---|
| ocrPipelinesR19.js | Round 25 | Loop 14 |
| ocrPipelinesR24.js | Round 30 | Loop 19 |
| **ocrPipelinesR28.js** ⭐ | **Round 35** | **Loop 24** |
| ocrPipelinesR29.js | Round 37 | Loop 26 |
| ocrPipelinesR31.js | Round 39 | Loop 28 |

## Production Usage

Pakai **R28 (Round 35)** untuk produksi:

```js
import { runRound28Iterations } from "./archive/pipelines/ocrPipelinesR28";
// atau dari src/ kalau masih aktif development:
// import { runRound28Iterations } from "./src/ocrPipelinesR28";

const results = await runRound28Iterations(imageUri);
const reading = results[4].value;  // iter140 tuned_trim_mega
const unit = results[4].unit;
```

**Akurasi**: 4/7 (57.1%) EXACT, reproducible 5/5 runs bit-identical, ~3-5s/gambar.

## Dependencies

Folder [deps/](deps/) berisi file yang dibutuhkan pipeline:

- [`textRecognition.native.js`](deps/textRecognition.native.js) — wrapper `@react-native-ml-kit/text-recognition`
- [`textRecognition.web.js`](deps/textRecognition.web.js) — Tesseract.js fallback untuk web
- [`groundTruth.js`](deps/groundTruth.js) — GT values + `verdictOf()` helper

Plus npm packages dari `package.json` parent:
- `expo-image-manipulator` (resize/rotate/crop/format)
- `@react-native-ml-kit/text-recognition`
- `expo-asset` (loading fixtures)

## Per-File Result Detail (Top 7 Rounds)

| File | GT | R25 | R30 | **R35** | R36 | R37 | R39 | R40 |
|---|---|---|---|---|---|---|---|---|
| image.png | 68.8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| image copy.png | 3.72g | ⚪ | ⚪ | ⚪ | ⚪ | ❌ 7.1 | ⚪ | ⚪ |
| image copy 2.png | 3.895 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| image copy 3.png | 52.8 | ❌ 8 | ❌ 8 | ❌ 8 | ❌ 8 | ❌ 8 | ❌ 8 | ❌ 8 |
| image copy 5.png | 48.65 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| image copy 6.png | 12.4g | ❌ 24 | ❌ 24 | ❌ 24 | ❌ 24 | ❌ 24 | ❌ 24 | ❌ 24 |
| image copy 7.png | 50.78 | ✅ 50.78 | 🟡 50.783 | **✅ 50.78** | ✅ | ✅ | ✅ | ✅ |

## Lessons Penting

1. **R28 (Round 35) = local optimum** sangat ketat. Modifikasi iter140 voter cenderung break image copy 7 EXACT.
2. **Preprocessing punya ceiling** — 3 sisa gagal butuh engine non-MLKit (TFLite custom / RapidOCR mobile / hp fisik).
3. **Vote aggregator > single-shot** — R25 PNG single-shot unreliable, R28 vote reproducible.
4. **Non-destructive principle** (R31) — boleh tambah fallback, jangan replace yang sudah win.

## Related Documentation

- [../../output/ANALISA.md](../../output/ANALISA.md) — master analisa 30 loop
- [../../output/COMPARISON_WINNERS.md](../../output/COMPARISON_WINNERS.md) — comparison report dengan image embeds
- [../../output/round-35-tuned-trim/](../../output/round-35-tuned-trim/) — R35 breakthrough analysis
- [../../output/round-41-final/analysis.md](../../output/round-41-final/analysis.md) — final 30-loop closing
