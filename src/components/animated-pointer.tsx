import { useEffect, useRef, useState } from 'react';
import { decodeAnimatedCursor, type CursorAnimation } from '../lib/animated-cursor';

type AnimatedPointerProps = {
  src: string;
  // Reports whether a decoded frame is on screen, so the caller only hides the system cursor when a replacement exists.
  onReadyChange: (ready: boolean) => void;
};

export function AnimatedPointer({ src, onReadyChange }: AnimatedPointerProps) {
  const [animation, setAnimation] = useState<CursorAnimation | null>(null);
  const [step, setStep] = useState(0);
  const pointerRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    let loaded: CursorAnimation | null = null;
    fetch(src, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load ${src}`);
        return response.arrayBuffer();
      })
      .then((buffer) => {
        if (controller.signal.aborted) return;
        loaded = decodeAnimatedCursor(buffer);
        setAnimation(loaded);
        setStep(0);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) console.error('Animated cursor unavailable', error);
      });
    return () => {
      controller.abort();
      setAnimation(null);
      loaded?.frames.forEach(URL.revokeObjectURL);
    };
  }, [src]);

  useEffect(() => {
    const ready = animation !== null;
    onReadyChange(ready);
    return () => {
      if (ready) onReadyChange(false);
    };
  }, [animation, onReadyChange]);

  useEffect(() => {
    if (!animation) return;
    const timer = window.setTimeout(() => setStep((current) => (current + 1) % animation.sequence.length), animation.delays[step]);
    return () => window.clearTimeout(timer);
  }, [animation, step]);

  useEffect(() => {
    if (!animation) return;
    const move = (event: PointerEvent) => {
      if (!pointerRef.current) return;
      const bounds = pointerRef.current.parentElement?.getBoundingClientRect();
      const inside = bounds && event.clientX >= bounds.left && event.clientX < bounds.right && event.clientY >= bounds.top && event.clientY < bounds.bottom;
      pointerRef.current.style.display = inside ? 'block' : 'none';
      if (!inside) return;
      pointerRef.current.style.left = `${event.clientX - animation.hotspot.x}px`;
      pointerRef.current.style.top = `${event.clientY - animation.hotspot.y}px`;
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, [animation]);

  const frame = animation?.frames[animation.sequence[step]];
  if (!frame) return null;
  return <img ref={pointerRef} className="animated-pointer" src={frame} alt="" aria-hidden="true" />;
}
