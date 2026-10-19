// Mapping modelId → runner function dari pipeline files.
// Setiap runner return array of iter results, di mana item terakhir adalah
// aggregator/final value (yang dipakai sebagai best result).

import { runRound19Iterations } from "./pipelines/r25-png-extent";
import { runRound24Iterations } from "./pipelines/r30-production-lean";
import { runRound28Iterations } from "./pipelines/r35-tuned-trim";
import { runRound29Iterations } from "./pipelines/r37-lcd-attack";
import { runRound31Iterations } from "./pipelines/r39-non-destructive";

const RUNNERS = {
  r25: runRound19Iterations,
  r30: runRound24Iterations,
  r35: runRound28Iterations,
  r37: runRound29Iterations,
  r39: runRound31Iterations,
};

export async function runOcr(modelId, imageUri) {
  const runner = RUNNERS[modelId];
  if (!runner) throw new Error(`Unknown model: ${modelId}`);

  const startedAt = Date.now();
  const iters = await runner(imageUri);
  const elapsedMs = Date.now() - startedAt;

  // Best result = aggregator (last iter), atau fallback ke iter dengan digits terbanyak
  const lastIter = iters[iters.length - 1];
  const best = lastIter?.value != null
    ? lastIter
    : iters.filter((it) => it.value != null).sort((a, b) => {
        const aDigits = String(Math.round(Math.abs(a.value ?? 0))).length;
        const bDigits = String(Math.round(Math.abs(b.value ?? 0))).length;
        return bDigits - aDigits;
      })[0] ?? null;

  return {
    value: best?.value ?? null,
    unit: best?.unit ?? null,
    bestIter: best ? `iter${best.iter}` : null,
    bestMethod: best?.method ?? null,
    elapsedMs,
    iters: iters.map((it) => ({
      iter: it.iter,
      method: it.method,
      value: it.value,
      ms: it.ms ?? 0,
      verdict: it.value != null ? "ok" : "miss",
    })),
  };
}
