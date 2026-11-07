import { cursorKeys, iconLabels, soundEvents } from '../data/theme-format';
import type { DesktopIconId, ThemeImportResult, ThemeManifest, WallpaperLayout } from '../types/theme';
import { convertMicrosoftAdpcm } from './wav';

type IniDocument = Map<string, Map<string, string>>;

type ThemeFileEntry = {
  file: File;
  path: string;
};

type LocalThemeManifest = {
  files: string[];
};

// Only system-wide and Explorer events map to sounds this app plays; other apps reuse the same event names.
const SOUND_APPS = new Set(['.default', 'explorer']);

const ICON_SECTIONS: Record<string, DesktopIconId> = {
  '20d04fe0-3aea-1069-a2d8-08002b30309d': 'computer',
  '450d8fba-ad25-11d0-98a8-0800361b1103': 'documents',
  '59031a47-3f72-44a7-89c5-5595fe6b30ee': 'documents',
  '208d2c60-3aea-1069-a2d7-08002b30309d': 'network',
  'f02c1a0d-be21-4350-88b0-7367fc96ef3c': 'network',
  '645ff040-5081-101b-9f08-00aa002f954e': 'recycleEmpty',
};

function normalizePath(value: string) {
  const segments: string[] = [];
  for (const segment of value.replaceAll('\\', '/').split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') segments.pop();
    else segments.push(segment);
  }
  return segments.join('/').toLowerCase();
}

function dirname(path: string) {
  const separator = path.lastIndexOf('/');
  return separator < 0 ? '' : path.slice(0, separator);
}

function basename(path: string) {
  return path.slice(path.lastIndexOf('/') + 1);
}

function decodeTheme(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(buffer);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(buffer);
  // Without a BOM, accept valid UTF-8 (also covers ASCII and UTF-8 BOM); anything else is treated as a legacy ANSI file.
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

function parseWallpaperLayout(desktop: Map<string, string> | undefined): WallpaperLayout | undefined {
  const tile = desktop?.get('tilewallpaper')?.replaceAll('"', '');
  const style = desktop?.get('wallpaperstyle')?.replaceAll('"', '');
  // Windows centers when WallpaperStyle is absent, but these wallpapers were sized for the screen they shipped for.
  // The simulated screen has no fixed resolution, so keep them full-screen unless tiling is requested.
  if (style === undefined) return Number(tile) === 1 ? 'tile' : undefined;
  switch (Number(style)) {
    case 2: return 'stretch';
    case 6: return 'fit';
    case 10: return 'fill';
    case 22: return 'span';
    // TileWallpaper only applies with WallpaperStyle 0.
    default: return Number(tile) === 1 ? 'tile' : 'center';
  }
}

function parseIni(source: string): IniDocument {
  const document: IniDocument = new Map();
  let section: Map<string, string> | undefined;
  for (const rawLine of source.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';') || line.startsWith('#')) continue;
    const sectionMatch = line.match(/^\[(.+)]$/);
    if (sectionMatch) {
      const name = sectionMatch[1].trim().toLowerCase();
      section = document.get(name) ?? new Map();
      document.set(name, section);
      continue;
    }
    const separator = line.indexOf('=');
    if (!section || separator < 0) continue;
    section.set(line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim());
  }
  return document;
}

function cleanReference(value: string) {
  let reference = value.trim().replace(/,\s*-?\d+\s*$/, '').replace(/^"|"$/g, '');
  reference = reference.replace(/^%(themedir|windir|systemroot)%[\\/]*/i, '');
  reference = reference.replace(/^[a-z]:[\\/]+/i, '');
  return normalizePath(reference);
}

function createResolver(files: File[], getFilePath: (file: File) => string) {
  const byPath = new Map(files.map((file) => [getFilePath(file), file]));
  const byName = new Map<string, File | null>();
  for (const file of files) {
    const name = basename(getFilePath(file));
    byName.set(name, byName.has(name) ? null : file);
  }
  return (value: string, themeFile: File) => {
    if (!value.trim()) return undefined;
    const reference = cleanReference(value);
    const themeDirectory = dirname(getFilePath(themeFile));
    return byPath.get(normalizePath(`${themeDirectory}/${reference}`))
      ?? byPath.get(reference)
      ?? byName.get(basename(reference))
      ?? undefined;
  };
}

async function isAnimatedCursor(file: File) {
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = (start: number) => String.fromCharCode(...header.subarray(start, start + 4));
  return header.length === 12 && ascii(0) === 'RIFF' && ascii(8) === 'ACON';
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'theme';
}

async function importThemeEntries(entries: ThemeFileEntry[]): Promise<ThemeImportResult> {
  const files = entries.map(({ file }) => file);
  const paths = new Map(entries.map(({ file, path }) => [file, normalizePath(path)]));
  const getFilePath = (file: File) => paths.get(file) ?? normalizePath(file.name);
  const themeFiles = files.filter((file) => file.name.toLowerCase().endsWith('.theme'));
  if (themeFiles.length === 0) throw new Error('No .theme files were found in that folder.');

  const resolveFile = createResolver(files, getFilePath);
  const urls = new Set<string>();
  const originalUrls = new Map<File, string>();
  const audioUrls = new Map<File, Promise<string>>();
  const getUrl = (file: File) => {
    const existing = originalUrls.get(file);
    if (existing) return existing;
    const url = URL.createObjectURL(file);
    originalUrls.set(file, url);
    urls.add(url);
    return url;
  };
  const getAudioUrl = (file: File) => {
    const existing = audioUrls.get(file);
    if (existing) return existing;
    const promise = file.arrayBuffer().then((buffer) => {
      const converted = convertMicrosoftAdpcm(buffer);
      if (!converted) return getUrl(file);
      const url = URL.createObjectURL(converted);
      urls.add(url);
      return url;
    }).catch(() => getUrl(file));
    audioUrls.set(file, promise);
    return promise;
  };

  try {
    const manifests = await Promise.all(themeFiles.map(async (themeFile, index): Promise<ThemeManifest> => {
    const ini = parseIni(decodeTheme(await themeFile.arrayBuffer()));
    const missingAssets: string[] = [];
    const findAsset = (reference: string | undefined, label: string) => {
      if (!reference) return undefined;
      const file = resolveFile(reference, themeFile);
      if (!file) missingAssets.push(`${label}: ${reference}`);
      return file;
    };
    const resolve = (reference: string | undefined, label: string) => {
      const file = findAsset(reference, label);
      return file && getUrl(file);
    };

    const rawName = ini.get('theme')?.get('displayname');
    const filename = themeFile.name.replace(/\.theme$/i, '');
    const name = rawName && !rawName.startsWith('@') ? rawName : filename;
    const bpp = Number(ini.get('masterthemeselector')?.get('themecolorbpp'));
    const icons: ThemeManifest['icons'] = {};
    for (const [sectionName, values] of ini) {
      if (!sectionName.startsWith('clsid\\')) continue;
      const clsid = sectionName.match(/\{([^}]+)}/)?.[1];
      if (!clsid) continue;
      const iconId = ICON_SECTIONS[clsid];
      if (!iconId) continue;
      if (iconId === 'recycleEmpty') {
        icons.recycleEmpty = resolve(values.get('empty'), iconLabels.recycleEmpty);
        icons.recycleFull = resolve(values.get('full'), iconLabels.recycleFull);
      } else {
        icons[iconId] = resolve(values.get('defaultvalue'), iconLabels[iconId]);
      }
    }

    const cursors: ThemeManifest['cursors'] = {};
    for (const [key, reference] of ini.get('control panel\\cursors') ?? []) {
      const cursorId = cursorKeys[key];
      if (!cursorId) continue;
      const file = findAsset(reference, `Cursor ${key}`);
      if (file) cursors[cursorId] = { src: getUrl(file), animated: await isAnimatedCursor(file) };
    }

    const sounds: ThemeManifest['sounds'] = [];
    for (const [sectionName, values] of ini) {
      if (!sectionName.startsWith('appevents\\schemes\\apps\\')) continue;
      const parts = sectionName.split('\\').filter((part) => part !== '.current');
      if (!SOUND_APPS.has(parts[3])) continue;
      const event = soundEvents[parts.at(-1) ?? ''];
      const reference = values.get('defaultvalue');
      if (!event || !reference) continue;
      const file = resolveFile(reference, themeFile);
      if (!file) {
        missingAssets.push(`${event.label}: ${reference}`);
        continue;
      }
      sounds.push({
        ...event,
        src: await getAudioUrl(file),
        originalSrc: getUrl(file),
      });
    }

    return {
      id: `${slugify(name)}-${index}`,
      name,
      colorDepth: Number.isFinite(bpp) && bpp > 0 ? `${2 ** bpp} colors` : undefined,
      wallpaper: resolve(ini.get('control panel\\desktop')?.get('wallpaper'), 'Wallpaper'),
      wallpaperLayout: parseWallpaperLayout(ini.get('control panel\\desktop')),
      icons,
      cursors,
      sounds,
      missingAssets,
    };
    }));

    return {
      themes: manifests.sort((left, right) => left.name.localeCompare(right.name)),
      release: () => urls.forEach((url) => URL.revokeObjectURL(url)),
    };
  } catch (error) {
    urls.forEach(URL.revokeObjectURL);
    throw error;
  }
}

export function importThemes(fileList: FileList | File[]) {
  const entries = Array.from(fileList).map((file) => ({
    file,
    path: file.webkitRelativePath || file.name,
  }));
  return importThemeEntries(entries);
}

export async function importLocalThemes() {
  let response: Response;
  try {
    response = await fetch('/__local-themes/manifest');
  } catch {
    throw new Error('The local theme folder is only available from the localhost development server.');
  }
  if (!response.ok) {
    throw new Error(response.status === 404
      ? 'The local theme folder is only available from the localhost development server.'
      : 'The local theme folder could not be read.');
  }
  const manifest = await response.json() as LocalThemeManifest;
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new Error('local-themes is empty. Add a .theme file and its assets, then try again.');
  }

  const entries = await Promise.all(manifest.files.map(async (path): Promise<ThemeFileEntry> => {
    const fileResponse = await fetch(`/__local-themes/file?path=${encodeURIComponent(path)}`);
    if (!fileResponse.ok) throw new Error(`Could not read local-themes/${path}.`);
    const blob = await fileResponse.blob();
    return {
      file: new File([blob], basename(path), { type: blob.type }),
      path,
    };
  }));
  return importThemeEntries(entries);
}
