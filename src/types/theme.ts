export type DesktopIconId = 'computer' | 'documents' | 'network' | 'recycleEmpty' | 'recycleFull';

export type CursorId =
  | 'arrow' | 'text' | 'help' | 'precision' | 'alternate' | 'handwriting'
  | 'unavailable' | 'move' | 'resizeNs' | 'resizeWe' | 'resizeNwSe'
  | 'resizeNeSw' | 'up' | 'busy' | 'background' | 'busyStill' | 'backgroundStill';

export type ThemeCursor = {
  src: string;
  // Detected from the file header, not the cursor role or extension.
  animated: boolean;
};

export type SystemSound = {
  id: string;
  label: string;
  src: string;
  originalSrc: string;
};

export type ThemeManifest = {
  id: string;
  name: string;
  colorDepth?: string;
  wallpaper?: string;
  icons: Partial<Record<DesktopIconId, string>>;
  cursors: Partial<Record<CursorId, ThemeCursor>>;
  sounds: SystemSound[];
  missingAssets: string[];
};

export type ThemeImportResult = {
  themes: ThemeManifest[];
  release: () => void;
};
