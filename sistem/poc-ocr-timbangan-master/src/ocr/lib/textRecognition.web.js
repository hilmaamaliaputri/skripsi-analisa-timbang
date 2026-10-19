// Web: pakai Tesseract.js sebagai pengganti ML Kit.
// Format output disamakan: { text, blocks: [{ text, frame, lines: [...] }] }

let workerPromise = null;
const getWorker = async () => {
  if (!workerPromise) {
    const { createWorker } = await import("tesseract.js");
    workerPromise = createWorker("eng", 1).then(async (worker) => {
      await worker.setParameters({
        tessedit_pageseg_mode: "6",
      });
      return worker;
    });
  }
  return workerPromise;
};

const toFrame = (bbox) =>
  bbox
    ? {
        x: bbox.x0,
        y: bbox.y0,
        width: bbox.x1 - bbox.x0,
        height: bbox.y1 - bbox.y0,
      }
    : null;

export default {
  recognize: async (uri) => {
    const worker = await getWorker();
    const { data } = await worker.recognize(uri, {}, { blocks: true });
    const blocks = (data.blocks ?? []).map((b) => ({
      text: b.text ?? "",
      frame: toFrame(b.bbox),
      lines: (b.lines ?? []).map((l) => ({
        text: l.text ?? "",
        frame: toFrame(l.bbox),
      })),
    }));
    return { text: data.text ?? "", blocks };
  },
};
