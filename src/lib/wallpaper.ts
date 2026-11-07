import type { CSSProperties } from 'react';
import type { WallpaperLayout } from '../types/theme';

// Center and tile use the image's natural pixel size, as Windows does; the simulated screen has no fixed resolution.
export function wallpaperBackground(src: string, layout: WallpaperLayout | undefined): CSSProperties {
  const backgroundImage = `url("${src}")`;
  switch (layout) {
    case 'tile':
      return { backgroundImage, backgroundRepeat: 'repeat', backgroundSize: 'auto', backgroundPosition: 'left top' };
    case 'center':
      return { backgroundImage, backgroundRepeat: 'no-repeat', backgroundSize: 'auto', backgroundPosition: 'center' };
    case 'stretch':
      return { backgroundImage, backgroundRepeat: 'no-repeat', backgroundSize: '100% 100%' };
    case 'fit':
      return { backgroundImage, backgroundRepeat: 'no-repeat', backgroundSize: 'contain', backgroundPosition: 'center' };
    // Fill, span on a single screen, and unspecified layouts all cover the desktop.
    default:
      return { backgroundImage, backgroundRepeat: 'no-repeat', backgroundSize: 'cover', backgroundPosition: 'center' };
  }
}
