export type CursorAnimation = {
  frames: string[];
  sequence: number[];
  delays: number[];
  hotspot: { x: number; y: number };
};

function readChunks(
  view: DataView,
  start: number,
  end: number,
  visit: (id: string, offset: number, size: number) => void,
) {
  let offset = start;
  while (offset + 8 <= end) {
    const id = String.fromCharCode(...new Uint8Array(view.buffer, offset, 4));
    const size = view.getUint32(offset + 4, true);
    const dataOffset = offset + 8;
    if (dataOffset + size > end) throw new Error('Invalid ANI chunk length');
    visit(id, dataOffset, size);
    offset = dataOffset + size + (size % 2);
  }
}

export function decodeAnimatedCursor(buffer: ArrayBuffer): CursorAnimation {
  const view = new DataView(buffer);
  const signature = String.fromCharCode(...new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength)));
  if (signature !== 'RIFF' || buffer.byteLength < 12) throw new Error('Invalid ANI file');
  const riffEnd = Math.min(buffer.byteLength, view.getUint32(4, true) + 8);
  const form = String.fromCharCode(...new Uint8Array(buffer, 8, 4));
  if (form !== 'ACON') throw new Error('Unsupported ANI form');

  let defaultDelay = 6;
  let rates: number[] = [];
  let sequence: number[] = [];
  const frames: string[] = [];
  let hotspot = { x: 0, y: 0 };

  readChunks(view, 12, riffEnd, (id, offset, size) => {
    if (id === 'anih' && size >= 36) defaultDelay = view.getUint32(offset + 28, true);
    if (id === 'rate') {
      rates = Array.from({ length: Math.floor(size / 4) }, (_, index) =>
        view.getUint32(offset + index * 4, true),
      );
    }
    if (id === 'seq ') {
      sequence = Array.from({ length: Math.floor(size / 4) }, (_, index) =>
        view.getUint32(offset + index * 4, true),
      );
    }
    if (id !== 'LIST' || size < 4) return;
    const listType = String.fromCharCode(...new Uint8Array(buffer, offset, 4));
    if (listType !== 'fram') return;
    readChunks(view, offset + 4, offset + size, (frameId, frameOffset, frameSize) => {
      if (frameId !== 'icon' || frameSize < 22) return;
      const bytes = new Uint8Array(buffer.slice(frameOffset, frameOffset + frameSize));
      const cursor = new DataView(bytes.buffer);
      const resourceType = cursor.getUint16(2, true);
      // Frames may be cursors (type 2) or plain icons (type 1); icon frames carry no hotspot, so it stays 0,0.
      if (resourceType !== 1 && resourceType !== 2) return;
      if (resourceType === 2) {
        if (frames.length === 0) {
          hotspot = { x: cursor.getUint16(10, true), y: cursor.getUint16(12, true) };
        }
        // CUR and ICO share image data; replace the directory header for browser rendering.
        cursor.setUint16(2, 1, true);
        const count = cursor.getUint16(4, true);
        for (let index = 0; index < count; index += 1) {
          const entry = 6 + index * 16;
          if (entry + 16 > bytes.length) break;
          cursor.setUint16(entry + 4, 1, true);
          cursor.setUint16(entry + 6, 32, true);
        }
      }
      frames.push(URL.createObjectURL(new Blob([bytes], { type: 'image/x-icon' })));
    });
  });

  if (frames.length === 0) throw new Error('ANI file has no usable frames');
  if (sequence.length === 0) sequence = frames.map((_, index) => index);
  sequence = sequence.filter((index) => index < frames.length);
  if (sequence.length === 0) sequence = [0];
  const delays = sequence.map((_, index) => Math.max(16, ((rates[index] || defaultDelay || 6) * 1000) / 60));
  return { frames, sequence, delays, hotspot };
}
