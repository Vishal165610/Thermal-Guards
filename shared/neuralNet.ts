// Tiny forward-pass for the trained Thermal Guard network (Dense layers only).
//
// The model is TRAINED with TensorFlow.js (server/src/forecasting/train.ts) and saved as one
// JSON file. This file reads those same trained weights and runs the same maths (matrix
// multiply + bias + relu/sigmoid) in plain JavaScript, so the browser build can run the real
// neural network without downloading the 1+ MB TensorFlow.js library.
// `npm run evaluate` checks that the output matches TensorFlow.js.

export interface DenseLayer {
  w: Float32Array; // inDim x outDim, row-major (same layout as TensorFlow.js kernels)
  b: Float32Array;
  inDim: number;
  outDim: number;
  act: 'relu' | 'sigmoid' | 'linear';
}

export interface Net {
  layers: DenseLayer[];
  inputDim: number;
  outputDim: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** `raw` is the parsed content of server/models/thermal-guard-model.json. */
export function netFromModelFile(raw: any): Net {
  const bin = atob(raw.weightsBase64 as string);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const floats = new Float32Array(bytes.buffer);

  const specs: { name: string; shape: number[] }[] = raw.weightSpecs;
  let offset = 0;
  const tensors = specs.map((s) => {
    const n = s.shape.reduce((a, b) => a * b, 1);
    const data = floats.subarray(offset, offset + n);
    offset += n;
    return { name: s.name, shape: s.shape, data };
  });
  if (offset !== floats.length) throw new Error('weight file size does not match its description');

  const dense = (raw.modelTopology.config.layers as any[]).filter((l) => l.class_name === 'Dense');
  if (dense.length * 2 !== tensors.length) throw new Error('unexpected model layout');

  const layers: DenseLayer[] = dense.map((l, i) => {
    const k = tensors[2 * i];
    const b = tensors[2 * i + 1];
    const act = l.config.activation as string;
    if (act !== 'relu' && act !== 'sigmoid' && act !== 'linear') throw new Error(`unsupported activation ${act}`);
    return { w: k.data, b: b.data, inDim: k.shape[0], outDim: k.shape[1], act };
  });
  return { layers, inputDim: layers[0].inDim, outputDim: layers[layers.length - 1].outDim };
}

/** Runs a batch of rows through the network. Returns rows x outputDim values, row after row. */
export function forward(net: Net, rows: number[][]): Float32Array {
  const out = new Float32Array(rows.length * net.outputDim);
  for (let r = 0; r < rows.length; r++) {
    let cur: ArrayLike<number> = rows[r];
    for (const L of net.layers) {
      const next = new Float32Array(L.outDim);
      for (let j = 0; j < L.outDim; j++) next[j] = L.b[j];
      for (let i = 0; i < L.inDim; i++) {
        const v = cur[i];
        if (v === 0) continue;
        const base = i * L.outDim;
        for (let j = 0; j < L.outDim; j++) next[j] += v * L.w[base + j];
      }
      for (let j = 0; j < L.outDim; j++) {
        const z = next[j];
        next[j] = L.act === 'relu' ? Math.max(0, z) : L.act === 'sigmoid' ? 1 / (1 + Math.exp(-z)) : z;
      }
      cur = next;
    }
    out.set(cur as Float32Array, r * net.outputDim);
  }
  return out;
}
