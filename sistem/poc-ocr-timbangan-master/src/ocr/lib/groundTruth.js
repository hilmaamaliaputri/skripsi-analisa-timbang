// Ground truth dari hasil pembacaan manual visual (lihat output/ground-truth/manual_extraction.json).
// Disinkronkan agar bisa dipakai sebagai acuan akurasi di mode Benchmark.
export const GROUND_TRUTH = {
  "image.png": { value: 68.8, unit: "kg" },
  "image copy.png": { value: 3.72, unit: "g" },
  "image copy 2.png": { value: 3.895, unit: "kg" },
  "image copy 3.png": { value: 52.8, unit: "kg" },
  "image copy 5.png": { value: 48.65, unit: "kg" },
  "image copy 6.png": { value: 12.4, unit: "g" },
  "image copy 7.png": { value: 50.78, unit: "kg" },
};

export function verdictOf(pred, gtValue, tol = 0.05) {
  if (pred == null) return { verdict: "miss", relError: null };
  if (gtValue === 0) return { verdict: pred === 0 ? "exact" : "wrong", relError: null };
  if (pred === gtValue) return { verdict: "exact", relError: 0 };
  const err = Math.abs(pred - gtValue) / Math.abs(gtValue);
  return { verdict: err <= tol ? "close" : "wrong", relError: err };
}
