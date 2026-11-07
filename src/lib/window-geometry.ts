export type WindowBounds = { width: number; height: number };
export type WindowGeometry = { x: number; y: number; width: number; height: number };
export type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const MIN_WIDTH = 320;
const MIN_HEIGHT = 320;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function initialWindowGeometry(bounds: WindowBounds): WindowGeometry {
  const width = Math.min(bounds.width, Math.max(MIN_WIDTH, Math.min(1020, bounds.width - 150)));
  const height = Math.min(bounds.height, Math.max(MIN_HEIGHT, Math.min(730, bounds.height - 50)));
  return { x: (bounds.width - width) / 2, y: (bounds.height - height) / 2, width, height };
}

export function clampWindowGeometry(geometry: WindowGeometry, bounds: WindowBounds): WindowGeometry {
  const width = Math.min(geometry.width, bounds.width);
  const height = Math.min(geometry.height, bounds.height);
  return {
    x: clamp(geometry.x, 0, Math.max(0, bounds.width - width)),
    y: clamp(geometry.y, 0, Math.max(0, bounds.height - height)),
    width,
    height,
  };
}

export function moveWindowGeometry(geometry: WindowGeometry, dx: number, dy: number, bounds: WindowBounds): WindowGeometry {
  return {
    ...geometry,
    x: clamp(geometry.x + dx, 0, bounds.width - geometry.width),
    y: clamp(geometry.y + dy, 0, bounds.height - geometry.height),
  };
}

export function resizeWindowGeometry(geometry: WindowGeometry, edge: ResizeEdge, dx: number, dy: number, bounds: WindowBounds): WindowGeometry {
  let { x, y, width, height } = geometry;
  const minimumWidth = Math.min(MIN_WIDTH, bounds.width);
  const minimumHeight = Math.min(MIN_HEIGHT, bounds.height);

  if (edge.includes('w')) {
    const right = x + width;
    x = clamp(x + dx, 0, right - minimumWidth);
    width = right - x;
  } else if (edge.includes('e')) {
    width = clamp(width + dx, minimumWidth, bounds.width - x);
  }
  if (edge.includes('n')) {
    const bottom = y + height;
    y = clamp(y + dy, 0, bottom - minimumHeight);
    height = bottom - y;
  } else if (edge.includes('s')) {
    height = clamp(height + dy, minimumHeight, bounds.height - y);
  }
  return { x, y, width, height };
}
