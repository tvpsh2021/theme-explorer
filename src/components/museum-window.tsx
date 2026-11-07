import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { cursorTypes, iconLabels } from '../data/theme-format';
import type { Locale } from '../i18n';
import { wallpaperBackground } from '../lib/wallpaper';
import { moveWindowGeometry, resizeWindowGeometry, type ResizeEdge, type WindowGeometry } from '../lib/window-geometry';
import type { CursorId, DesktopIconId, ThemeManifest } from '../types/theme';

type Gesture = {
  pointerId: number;
  startX: number;
  startY: number;
  geometry: WindowGeometry;
  edge?: ResizeEdge;
};

const RESIZE_EDGES: ResizeEdge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
const ICON_ORDER: DesktopIconId[] = ['computer', 'documents', 'network', 'recycleEmpty', 'recycleFull'];

type MuseumWindowProps = {
  locale: Locale;
  themes: ThemeManifest[];
  selected: ThemeManifest | null;
  onSelect: (theme: ThemeManifest) => void;
  onImport: (files: FileList) => void;
  onLoadLocal: () => void;
  active: boolean;
  onActivate: () => void;
  importing: boolean;
  importSource: 'local' | 'upload' | null;
  importError: string | null;
  onClose: () => void;
  onMinimize: () => void;
  maximized: boolean;
  onToggleMaximize: () => void;
  geometry: WindowGeometry | null;
  onGeometryChange: (geometry: WindowGeometry) => void;
  onPlaySound: (src: string) => void;
  activeCursor: CursorId;
  onCursorSelect: (id: CursorId) => void;
  soundError: string | null;
};

// The preview box is far smaller than the desktop, so only tiling is reproduced; other layouts show the image itself.
function wallpaperPreviewStyle(src: string, layout: ThemeManifest['wallpaperLayout']) {
  return layout === 'tile' ? wallpaperBackground(src, 'tile') : { backgroundImage: `url("${src}")` };
}

const copy = {
  'zh-TW': {
    title: '佈景主題', file: '檔案', view: '檢視', help: '說明', themes: '佈景主題', desktop: '桌面', appearance: '外觀', settings: '設定值', loading: '載入中…', importing: '匯入中…', loadLocal: '載入 local-themes', chooseFolder: '選擇資料夾…', loadThemes: '載入佈景主題', folderRequirement: '資料夾需要包含一個以上的 .theme 檔案與其引用的素材。', localFolder: '本機開發資料夾', localFolderDescription: '將檔案放進 local-themes/，再透過 localhost 開發伺服器載入。', loadingFiles: '載入檔案中…', chooseDevice: '從這台裝置選擇', chooseDescription: '選擇一個資料夾供目前瀏覽器工作階段使用，檔案只會在本機處理。', readingFiles: '讀取檔案中…', privacy: '兩種方式都不會將佈景主題上傳到外部服務。', loaded: '個已載入', nowShowing: '目前顯示', colorDepthUnknown: '未指定色彩深度', wallpaperPreview: '桌布預覽', noWallpaper: '找不到桌布', desktopIcons: '桌面圖示', noneResolved: '未找到', cursors: '游標', resolved: '個已找到', mousePointers: '滑鼠指標', clickToUse: '按一下即可使用', noCursors: '找不到游標檔案', systemSounds: '系統音效', clickToPlay: '按一下即可播放', noSounds: '找不到 WAV 檔案', referencedFilesMissing: '個引用檔案找不到', loadedStatus: '個佈景主題已載入至本機', noFolder: '尚未選擇佈景主題資料夾', minimize: '最小化佈景主題', restore: '還原佈景主題視窗', maximize: '最大化佈景主題視窗', close: '關閉佈景主題', themeNumber: '佈景主題',
  },
  en: {
    title: 'Themes', file: 'File', view: 'View', help: 'Help', themes: 'Themes', desktop: 'Desktop', appearance: 'Appearance', settings: 'Settings', loading: 'Loading…', importing: 'Importing…', loadLocal: 'Load local-themes', chooseFolder: 'Choose folder…', loadThemes: 'Load themes', folderRequirement: 'The folder must contain at least one .theme file and its referenced assets.', localFolder: 'Local development folder', localFolderDescription: 'Place files in local-themes/ and load them through the localhost development server.', loadingFiles: 'Loading files…', chooseDevice: 'Choose from this device', chooseDescription: 'Choose a folder for this browser session. Files are processed only on this device.', readingFiles: 'Reading files…', privacy: 'Neither method uploads your themes to an external service.', loaded: ' loaded', nowShowing: 'NOW SHOWING', colorDepthUnknown: 'Color depth not specified', wallpaperPreview: 'WALLPAPER PREVIEW', noWallpaper: 'NO WALLPAPER FOUND', desktopIcons: 'DESKTOP ICONS', noneResolved: 'None resolved', cursors: 'CURSORS', resolved: ' resolved', mousePointers: 'MOUSE POINTERS', clickToUse: 'Click to use', noCursors: 'No cursor files resolved', systemSounds: 'SYSTEM SOUNDS', clickToPlay: 'Click to play', noSounds: 'No WAV files resolved', referencedFilesMissing: ' referenced files were not found', loadedStatus: ' themes loaded locally', noFolder: 'No theme folder selected', minimize: 'Minimize Themes', restore: 'Restore Themes', maximize: 'Maximize Themes', close: 'Close Themes', themeNumber: 'Theme',
  },
} as const;

export function MuseumWindow({ locale, themes, selected, onSelect, onImport, onLoadLocal, active, onActivate, importing, importSource, importError, onClose, onMinimize, maximized, onToggleMaximize, geometry, onGeometryChange, onPlaySound, activeCursor, onCursorSelect, soundError }: MuseumWindowProps) {
  const windowRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const cursorOptions = selected ? cursorTypes.filter((type) => selected.cursors[type.id]) : [];
  const iconOptions = selected ? ICON_ORDER.filter((id) => selected.icons[id]) : [];
  const text = copy[locale];

  useEffect(() => {
    inputRef.current?.setAttribute('webkitdirectory', '');
    inputRef.current?.setAttribute('directory', '');
  }, []);

  function chooseFolder() {
    inputRef.current?.click();
  }

  function beginGesture(event: ReactPointerEvent<HTMLDivElement>, edge?: ResizeEdge) {
    if (maximized || !geometry || event.button !== 0) return;
    if (!edge && event.target instanceof Element && event.target.closest('.window-actions')) return;
    gestureRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, geometry, edge };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function updateGesture(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    const desktop = windowRef.current?.parentElement;
    if (!gesture || gesture.pointerId !== event.pointerId || !desktop) return;
    const bounds = { width: desktop.clientWidth, height: Math.max(0, desktop.clientHeight - 40) };
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    onGeometryChange(gesture.edge
      ? resizeWindowGeometry(gesture.geometry, gesture.edge, dx, dy, bounds)
      : moveWindowGeometry(gesture.geometry, dx, dy, bounds));
  }

  function endGesture(event: ReactPointerEvent<HTMLDivElement>) {
    if (gestureRef.current?.pointerId === event.pointerId) gestureRef.current = null;
  }

  return (
    <section ref={windowRef} className={`window museum-window ${maximized ? 'maximized' : ''}`} aria-label={text.title} onPointerDownCapture={onActivate} style={{ ...(geometry && !maximized ? { left: geometry.x, top: geometry.y, width: geometry.width, height: geometry.height, transform: 'none' } : {}), zIndex: active ? 4 : 2 }}>
      <input
        ref={inputRef}
        className="folder-input"
        type="file"
        multiple
        onChange={(event) => {
          if (event.target.files?.length) onImport(event.target.files);
          event.target.value = '';
        }}
      />
      <div className="title-bar" onPointerDown={(event) => beginGesture(event)} onPointerMove={updateGesture} onPointerUp={endGesture} onPointerCancel={endGesture} onLostPointerCapture={endGesture}>
        <div className="title-text"><span className="title-icon">▧</span> {text.title}</div>
        <div className="window-actions">
          <button type="button" aria-label={text.minimize} onClick={onMinimize}><span className="control-glyph minimize-glyph" aria-hidden="true" /></button>
          <button type="button" aria-label={maximized ? text.restore : text.maximize} onClick={onToggleMaximize}><span className={`control-glyph ${maximized ? 'restore-glyph' : 'maximize-glyph'}`} aria-hidden="true" /></button>
          <button type="button" aria-label={text.close} onClick={onClose}><span className="control-glyph close-glyph" aria-hidden="true" /></button>
        </div>
      </div>
      <div className="menu-bar"><span>{text.file}</span><span>{text.view}</span><span>{text.help}</span></div>
      <div className="window-body">
        <div className="settings-tabs" role="tablist" aria-label={text.title}>
          <button type="button" className="selected" role="tab" aria-selected="true">{text.themes}</button>
          <button type="button" role="tab" aria-selected="false" disabled>{text.desktop}</button>
          <button type="button" role="tab" aria-selected="false" disabled>{text.appearance}</button>
          <button type="button" role="tab" aria-selected="false" disabled>{text.settings}</button>
          <div className="settings-actions">
            <button type="button" onClick={onLoadLocal} disabled={importing}>{importing && importSource === 'local' ? text.loading : text.loadLocal}</button>
            <button type="button" onClick={chooseFolder} disabled={importing}>{importing && importSource === 'upload' ? text.importing : text.chooseFolder}</button>
          </div>
        </div>
        {!selected ? (
          <div className="import-empty">
            <h2>{text.loadThemes}</h2>
            <p>{text.folderRequirement}</p>
            <div className="import-options">
              <section className="import-option">
                <div className="folder-mark" aria-hidden="true">▱</div>
                <h3>{text.localFolder}</h3>
                <p>{text.localFolderDescription}</p>
                <button className="win-button import-button" type="button" onClick={onLoadLocal} disabled={importing}>{importing && importSource === 'local' ? text.loadingFiles : text.loadLocal}</button>
              </section>
              <section className="import-option">
                <div className="folder-mark upload-mark" aria-hidden="true">⇧</div>
                <h3>{text.chooseDevice}</h3>
                <p>{text.chooseDescription}</p>
                <button className="win-button import-button" type="button" onClick={chooseFolder} disabled={importing}>{importing && importSource === 'upload' ? text.readingFiles : text.chooseFolder}</button>
              </section>
            </div>
            {importError && <p className="import-error" role="alert">{importError}</p>}
            <p className="privacy-note">{text.privacy}</p>
          </div>
        ) : (
          <div className="museum-layout">
            <aside className="theme-list-pane">
              <div className="pane-heading"><span>{text.themes.toUpperCase()}</span><span>{themes.length}{text.loaded}</span></div>
              <div className="theme-list" role="listbox" aria-label={text.themes}>
                {themes.map((theme, index) => (
                  <button key={theme.id} type="button" className={`theme-option ${theme.id === selected.id ? 'selected' : ''}`} role="option" aria-selected={theme.id === selected.id} onClick={() => onSelect(theme)}>
                    <span className="theme-number">{String(index + 1).padStart(2, '0')}</span>
                    <span className="theme-option-name">{theme.name}</span>
                    <span className="theme-arrow">›</span>
                  </button>
                ))}
              </div>
            </aside>
            <div className="theme-detail">
              <div className="detail-topline"><span>{text.nowShowing}</span><span>{selected.colorDepth ?? text.colorDepthUnknown}</span></div>
              <div className={`wallpaper-preview ${selected.wallpaper ? '' : 'missing-preview'}`} style={selected.wallpaper ? wallpaperPreviewStyle(selected.wallpaper, selected.wallpaperLayout) : undefined}>
                <span className="preview-label">{selected.wallpaper ? text.wallpaperPreview : text.noWallpaper}</span>
              </div>
              <div className="detail-heading"><h2>{selected.name}</h2><span>{text.themeNumber} {String(themes.indexOf(selected) + 1).padStart(2, '0')} / {themes.length}</span></div>
              <div className="asset-strip">
                <div><span className="asset-label">{text.desktopIcons}</span><div className="icon-preview">
                  {iconOptions.length > 0
                    ? iconOptions.map((id) => <img key={id} src={selected.icons[id]} alt={iconLabels[id]} title={iconLabels[id]} />)
                    : <span className="asset-empty">{text.noneResolved}</span>}
                </div></div>
                <div className="cursor-demo"><span className="asset-label">{text.cursors}</span><span className="asset-count">{cursorOptions.length}{text.resolved}</span></div>
              </div>
              <div className="sound-heading"><span className="asset-label">{text.mousePointers}</span><span>{cursorOptions.length ? text.clickToUse : text.noCursors}</span></div>
              {cursorOptions.length > 0 && <div className="cursor-grid">
                {cursorOptions.map((type) => {
                  const cursor = selected.cursors[type.id]!;
                  const active = activeCursor === type.id;
                  return <button key={type.id} type="button" className={`cursor-sample ${active ? 'selected' : ''}`} aria-pressed={active} style={cursor.animated ? undefined : { cursor: `url("${cursor.src}"), auto` }} onClick={() => onCursorSelect(type.id)}><span>↖</span>{type.label}</button>;
                })}
              </div>}
              <div className="sound-heading"><span className="asset-label">{text.systemSounds}</span><span>{selected.sounds.length ? text.clickToPlay : text.noSounds}</span></div>
              {selected.sounds.length > 0 && <div className="sound-grid">
                {selected.sounds.map((sound) => <button type="button" className="sound-button" key={sound.id} onClick={() => onPlaySound(sound.src)}><span className="play-icon">▶</span>{sound.label}</button>)}
              </div>}
              {soundError && <p className="sound-error" role="alert">{soundError}</p>}
              {importError && <p className="import-error" role="alert">{importError}</p>}
              {selected.missingAssets.length > 0 && <details className="import-diagnostics">
                <summary>{selected.missingAssets.length}{text.referencedFilesMissing}</summary>
                <ul>{selected.missingAssets.map((message) => <li key={message}>{message}</li>)}</ul>
              </details>}
            </div>
          </div>
        )}
      </div>
      <div className="status-bar"><span>{themes.length ? `${themes.length}${text.loadedStatus}` : text.noFolder}</span><span>{text.title}</span></div>
      {!maximized && geometry && RESIZE_EDGES.map((edge) => <div key={edge} className={`resize-handle resize-${edge}`} aria-hidden="true" onPointerDown={(event) => beginGesture(event, edge)} onPointerMove={updateGesture} onPointerUp={endGesture} onPointerCancel={endGesture} onLostPointerCapture={endGesture} />)}
    </section>
  );
}
