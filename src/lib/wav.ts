function findChunk(view: DataView, expected: string) {
  let offset = 12;
  while (offset + 8 <= view.byteLength) {
    const id = String.fromCharCode(...new Uint8Array(view.buffer, offset, 4));
    const size = view.getUint32(offset + 4, true);
    const dataOffset = offset + 8;
    if (dataOffset + size > view.byteLength) throw new Error('Invalid WAV chunk length');
    if (id === expected) return { offset: dataOffset, size };
    offset = dataOffset + size + (size % 2);
  }
  return undefined;
}

function clamp16(value: number) {
  return Math.min(32767, Math.max(-32768, value));
}

type DecoderState = {
  sample1: number;
  sample2: number;
  delta: number;
  coefficient1: number;
  coefficient2: number;
};

const ADAPTATION = [230, 230, 230, 230, 307, 409, 512, 614, 768, 614, 512, 409, 307, 230, 230, 230];

function expandNibble(state: DecoderState, nibble: number) {
  const prediction = Math.trunc((state.sample1 * state.coefficient1 + state.sample2 * state.coefficient2) / 256);
  const signed = nibble & 8 ? nibble - 16 : nibble;
  const sample = clamp16(prediction + signed * state.delta);
  state.sample2 = state.sample1;
  state.sample1 = sample;
  state.delta = Math.max(16, (ADAPTATION[nibble] * state.delta) >> 8);
  return sample;
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
}

export function convertMicrosoftAdpcm(buffer: ArrayBuffer): Blob | undefined {
  if (buffer.byteLength < 20) throw new Error('Truncated WAV file');
  const view = new DataView(buffer);
  const riff = String.fromCharCode(...new Uint8Array(buffer, 0, 4));
  const wave = String.fromCharCode(...new Uint8Array(buffer, 8, 4));
  if (riff !== 'RIFF' || wave !== 'WAVE') throw new Error('Not a RIFF WAVE file');

  const format = findChunk(view, 'fmt ');
  const data = findChunk(view, 'data');
  if (!format || !data || format.size < 16) throw new Error('Incomplete WAV file');
  const codec = view.getUint16(format.offset, true);
  if (codec === 1) return undefined;
  const channels = view.getUint16(format.offset + 2, true);
  const sampleRate = view.getUint32(format.offset + 4, true);
  const blockAlign = view.getUint16(format.offset + 12, true);
  const bits = view.getUint16(format.offset + 14, true);
  if (codec !== 2 || bits !== 4 || (channels !== 1 && channels !== 2)) {
    throw new Error(`Unsupported WAV codec ${codec}`);
  }

  const coefficientCount = view.getUint16(format.offset + 20, true);
  const coefficients = Array.from({ length: coefficientCount }, (_, index) => ({
    first: view.getInt16(format.offset + 22 + index * 4, true),
    second: view.getInt16(format.offset + 24 + index * 4, true),
  }));
  const samples: number[] = [];

  for (let blockOffset = data.offset; blockOffset < data.offset + data.size; blockOffset += blockAlign) {
    const blockEnd = Math.min(blockOffset + blockAlign, data.offset + data.size);
    const headerSize = channels * 7;
    if (blockOffset + headerSize > blockEnd) throw new Error('Truncated ADPCM block');
    const states: DecoderState[] = [];
    for (let channel = 0; channel < channels; channel += 1) {
      const predictor = view.getUint8(blockOffset + channel);
      const coefficient = coefficients[predictor];
      if (!coefficient) throw new Error('Invalid ADPCM predictor');
      states.push({
        delta: Math.max(16, view.getInt16(blockOffset + channels + channel * 2, true)),
        sample1: view.getInt16(blockOffset + channels * 3 + channel * 2, true),
        sample2: view.getInt16(blockOffset + channels * 5 + channel * 2, true),
        coefficient1: coefficient.first,
        coefficient2: coefficient.second,
      });
    }
    states.forEach((state) => samples.push(state.sample2));
    states.forEach((state) => samples.push(state.sample1));
    for (let offset = blockOffset + headerSize; offset < blockEnd; offset += 1) {
      const byte = view.getUint8(offset);
      samples.push(expandNibble(states[0], byte >> 4));
      samples.push(expandNibble(states[channels - 1], byte & 15));
    }
  }

  const fact = findChunk(view, 'fact');
  const frameCount = fact && fact.size >= 4 ? view.getUint32(fact.offset, true) : undefined;
  const sampleCount = frameCount ? Math.min(samples.length, frameCount * channels) : samples.length;
  const output = new ArrayBuffer(44 + sampleCount * 2);
  const outputView = new DataView(output);
  writeAscii(outputView, 0, 'RIFF');
  outputView.setUint32(4, output.byteLength - 8, true);
  writeAscii(outputView, 8, 'WAVE');
  writeAscii(outputView, 12, 'fmt ');
  outputView.setUint32(16, 16, true);
  outputView.setUint16(20, 1, true);
  outputView.setUint16(22, channels, true);
  outputView.setUint32(24, sampleRate, true);
  outputView.setUint32(28, sampleRate * channels * 2, true);
  outputView.setUint16(32, channels * 2, true);
  outputView.setUint16(34, 16, true);
  writeAscii(outputView, 36, 'data');
  outputView.setUint32(40, sampleCount * 2, true);
  for (let index = 0; index < sampleCount; index += 1) outputView.setInt16(44 + index * 2, samples[index], true);
  return new Blob([output], { type: 'audio/wav' });
}
