import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { AnimatedPointer } from './components/animated-pointer';
import { ComputerWindow, type ExplorerLocation } from './components/computer-window';
import { DesktopIcon } from './components/desktop-icon';
import { LanguageWindow } from './components/language-window';
import { MuseumWindow } from './components/museum-window';
import { StartMenu } from './components/start-menu';
import { Taskbar } from './components/taskbar';
import { interactionSounds } from './data/theme-format';
import { appCopy, LANGUAGE_PREFERENCE_KEY, loadLanguagePreference, resolveLocale, type LanguagePreference } from './i18n';
import { importLocalThemes, importThemes } from './lib/theme-loader';
import { clampWindowGeometry, initialWindowGeometry, type WindowGeometry } from './lib/window-geometry';
import type { CursorId, ThemeImportResult, ThemeManifest } from './types/theme';

export function App() {
  const [languagePreference, setLanguagePreference] = useState<LanguagePreference>(loadLanguagePreference);
  const locale = resolveLocale(languagePreference);
  const text = appCopy[locale];
  const [themes, setThemes] = useState<ThemeManifest[]>([]);
  const [theme, setTheme] = useState<ThemeManifest | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSource, setImportSource] = useState<'local' | 'upload' | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [windowStatus, setWindowStatus] = useState<'open' | 'minimized' | 'closed'>('open');
  const [computerStatus, setComputerStatus] = useState<'open' | 'minimized' | 'closed'>('closed');
  const [explorerLocation, setExplorerLocation] = useState<ExplorerLocation>('computer');
  const [languageStatus, setLanguageStatus] = useState<'open' | 'minimized' | 'closed'>('closed');
  const [activeWindow, setActiveWindow] = useState<'themes' | 'language' | 'computer'>('themes');
  const [maximized, setMaximized] = useState(false);
  const [windowGeometry, setWindowGeometry] = useState<WindowGeometry | null>(null);
  const [recycleFull, setRecycleFull] = useState(true);
  const [startOpen, setStartOpen] = useState(false);
  const [activeCursor, setActiveCursor] = useState<CursorId>('arrow');
  const [animatedPointerReady, setAnimatedPointerReady] = useState(false);
  const [soundError, setSoundError] = useState<string | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; x: number; y: number } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const interactionAudioRef = useRef<Set<HTMLAudioElement>>(new Set());
  const recycleTimerRef = useRef<number | null>(null);
  const desktopRef = useRef<HTMLElement | null>(null);
  const importRef = useRef<ThemeImportResult | null>(null);

  useEffect(() => {
    const desktop = desktopRef.current;
    if (!desktop) return;
    const updateBounds = () => {
      const bounds = { width: desktop.clientWidth, height: Math.max(0, desktop.clientHeight - 40) };
      setWindowGeometry((current) => current ? clampWindowGeometry(current, bounds) : initialWindowGeometry(bounds));
    };
    updateBounds();
    const observer = new ResizeObserver(updateBounds);
    observer.observe(desktop);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      interactionAudioRef.current.forEach((audio) => audio.pause());
      if (recycleTimerRef.current !== null) window.clearTimeout(recycleTimerRef.current);
      importRef.current?.release();
    };
  }, []);

  function stopAudio() {
    audioRef.current?.pause();
    audioRef.current = null;
    interactionAudioRef.current.forEach((audio) => audio.pause());
    interactionAudioRef.current.clear();
  }

  async function loadThemes(loader: () => Promise<ThemeImportResult>, source: 'local' | 'upload') {
    setImporting(true);
    setImportSource(source);
    setImportError(null);
    try {
      const result = await loader();
      stopAudio();
      importRef.current?.release();
      importRef.current = result;
      setThemes(result.themes);
      setTheme(result.themes[0]);
      setSoundError(null);
      setActiveCursor('arrow');
      setWindowStatus('open');
      setActiveWindow('themes');
    } catch (error) {
      console.error('Theme import failed', error);
      setImportError(error instanceof Error ? error.message : 'The selected folder could not be imported.');
    } finally {
      setImporting(false);
      setImportSource(null);
    }
  }

  function loadThemeFolder(files: FileList) {
    void loadThemes(() => importThemes(files), 'upload');
  }

  function loadLocalThemeFolder() {
    void loadThemes(importLocalThemes, 'local');
  }

  function selectTheme(nextTheme: ThemeManifest) {
    stopAudio();
    setSoundError(null);
    setActiveCursor('arrow');
    setTheme(nextTheme);
  }

  async function playSound(src: string, overlap = false) {
    if (!overlap) audioRef.current?.pause();
    setSoundError(null);
    const audio = new Audio(src);
    if (overlap) {
      const active = interactionAudioRef.current;
      if (active.size >= 4) {
        const oldest = active.values().next().value;
        oldest?.pause();
        if (oldest) active.delete(oldest);
      }
      active.add(audio);
      audio.addEventListener('ended', () => active.delete(audio), { once: true });
    } else {
      audioRef.current = audio;
    }
    try {
      await audio.play();
    } catch (error) {
      if (overlap) {
        const active = interactionAudioRef.current.has(audio);
        interactionAudioRef.current.delete(audio);
        if (!active) return;
      } else if (audioRef.current !== audio) return;
      console.error('System sound playback failed', error);
      setSoundError('This sound could not be played in your browser.');
    }
  }

  function playInteractionSound(event: keyof typeof interactionSounds) {
    if (!theme) return;
    const sound = interactionSounds[event]
      .map((id) => theme.sounds.find((item) => item.id === id))
      .find((item) => item !== undefined);
    if (sound) void playSound(sound.src, true);
  }

  function openMuseum(fromStartMenu = false) {
    if (windowStatus === 'minimized') playInteractionSound('restoreUp');
    else if (fromStartMenu) playInteractionSound('startLaunch');
    else if (windowStatus === 'closed') playInteractionSound('open');
    if (windowStatus === 'closed') setMaximized(false);
    setWindowStatus('open');
    setActiveWindow('themes');
    setStartOpen(false);
  }

  function minimizeMuseum() {
    setWindowStatus('minimized');
    setStartOpen(false);
    if (computerStatus === 'open') setActiveWindow('computer');
    else if (languageStatus === 'open') setActiveWindow('language');
    playInteractionSound('minimize');
  }

  function toggleMaximize() {
    const next = !maximized;
    setMaximized(next);
    playInteractionSound(next ? 'maximize' : 'restoreDown');
  }

  function closeMuseum() {
    setWindowStatus('closed');
    // Closing Themes ends an animated cursor preview, matching how a static selection persists.
    if (selectedCursor?.animated) setActiveCursor('arrow');
    setMaximized(false);
    if (computerStatus === 'open') setActiveWindow('computer');
    else if (languageStatus === 'open') setActiveWindow('language');
    playInteractionSound('close');
  }

  function toggleTaskbarWindow() {
    if (windowStatus === 'open' && activeWindow === 'themes') minimizeMuseum();
    else openMuseum();
  }

  function openLanguage(fromStartMenu = false) {
    if (languageStatus === 'minimized') playInteractionSound('restoreUp');
    else if (fromStartMenu) playInteractionSound('startLaunch');
    else if (languageStatus === 'closed') playInteractionSound('open');
    setLanguageStatus('open');
    setActiveWindow('language');
    setStartOpen(false);
  }

  function minimizeLanguage() {
    setLanguageStatus('minimized');
    if (windowStatus === 'open') setActiveWindow('themes');
    else if (computerStatus === 'open') setActiveWindow('computer');
    playInteractionSound('minimize');
  }

  function closeLanguage() {
    setLanguageStatus('closed');
    if (windowStatus === 'open') setActiveWindow('themes');
    else if (computerStatus === 'open') setActiveWindow('computer');
    playInteractionSound('close');
  }

  function toggleLanguageWindow() {
    if (languageStatus === 'open' && activeWindow === 'language') minimizeLanguage();
    else openLanguage();
  }

  function selectLanguage(preference: LanguagePreference) {
    setLanguagePreference(preference);
    if (preference === 'browser') window.localStorage.removeItem(LANGUAGE_PREFERENCE_KEY);
    else window.localStorage.setItem(LANGUAGE_PREFERENCE_KEY, preference);
  }

  function openComputer(location: ExplorerLocation = 'computer') {
    setExplorerLocation(location);
    setComputerStatus('open');
    setActiveWindow('computer');
    setStartOpen(false);
  }

  function minimizeComputer() {
    setComputerStatus('minimized');
    if (windowStatus === 'open') setActiveWindow('themes');
    else if (languageStatus === 'open') setActiveWindow('language');
  }

  function closeComputer() {
    setComputerStatus('closed');
    if (windowStatus === 'open') setActiveWindow('themes');
    else if (languageStatus === 'open') setActiveWindow('language');
  }

  function toggleComputerWindow() {
    if (computerStatus === 'open' && activeWindow === 'computer') minimizeComputer();
    else {
      setComputerStatus('open');
      setActiveWindow('computer');
    }
  }

  function toggleStartMenu() {
    const next = !startOpen;
    setStartOpen(next);
    playInteractionSound(next ? 'startOpen' : 'startClose');
  }

  function emptyRecycleBin() {
    if (!recycleFull) return;
    setRecycleFull(false);
    playInteractionSound('emptyRecycle');
    if (recycleTimerRef.current !== null) window.clearTimeout(recycleTimerRef.current);
    recycleTimerRef.current = window.setTimeout(() => {
      setRecycleFull(true);
      recycleTimerRef.current = null;
    }, 15_000);
  }

  function startDesktopSelection(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0 || event.target instanceof Element && event.target.closest('button, .window, .taskbar, .start-menu')) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    if (y >= event.currentTarget.clientHeight - 40) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectionBox({ startX: x, startY: y, x, y });
  }

  function updateDesktopSelection(event: ReactPointerEvent<HTMLElement>) {
    const desktop = event.currentTarget;
    const pointerId = event.pointerId;
    const clientX = event.clientX;
    const clientY = event.clientY;
    const bounds = desktop.getBoundingClientRect();
    setSelectionBox((current) => {
      if (!current || !desktop.hasPointerCapture(pointerId)) return current;
      return {
        ...current,
        x: Math.min(desktop.clientWidth, Math.max(0, clientX - bounds.left)),
        y: Math.min(desktop.clientHeight - 40, Math.max(0, clientY - bounds.top)),
      };
    });
  }

  function endDesktopSelection(event: ReactPointerEvent<HTMLElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setSelectionBox(null);
  }

  const selectedCursor = theme?.cursors[activeCursor] ?? theme?.cursors.arrow;
  const recycleIcon = theme?.icons[recycleFull ? 'recycleFull' : 'recycleEmpty']
    ?? theme?.icons.recycleEmpty
    ?? theme?.icons.recycleFull
    ?? `/icons/recycle-${recycleFull ? 'full' : 'empty'}.png`;
  const animatedCursorSrc = selectedCursor?.animated ? selectedCursor.src : undefined;
  // Browsers cannot render ANI through CSS, so fall back to a static arrow while the animated pointer loads or fails.
  const cssCursorSrc = [selectedCursor, theme?.cursors.arrow].find((cursor) => cursor && !cursor.animated)?.src;
  const textCursorSrc = theme?.cursors.text && !theme.cursors.text.animated ? theme.cursors.text.src : undefined;

  return (
    <div className="screen-stage">
      <div className="screen-frame">
        <main
          ref={desktopRef}
          className={`desktop ${animatedCursorSrc && animatedPointerReady ? 'busy-mode' : ''}`}
          style={{
            backgroundImage: theme?.wallpaper ? `url("${theme.wallpaper}")` : undefined,
            '--arrow-cursor': cssCursorSrc ? `url("${cssCursorSrc}"), auto` : 'auto',
            '--text-cursor': textCursorSrc ? `url("${textCursorSrc}"), text` : 'text',
          } as React.CSSProperties}
          onClick={() => startOpen && setStartOpen(false)}
          onPointerDown={startDesktopSelection}
          onPointerMove={updateDesktopSelection}
          onPointerUp={endDesktopSelection}
          onPointerCancel={endDesktopSelection}
        >
          <div className="desktop-icons">
            <DesktopIcon label={text.computer} src={theme?.icons.computer ?? '/icons/computer.png'} onOpen={() => openComputer('computer')} />
            <DesktopIcon label={text.documents} src={theme?.icons.documents ?? '/icons/documents.png'} onOpen={() => openComputer('documents')} />
            <DesktopIcon label={text.network} src={theme?.icons.network ?? '/icons/network.png'} onOpen={() => openComputer('network')} />
            <DesktopIcon label={text.recycleBin} src={recycleIcon} onOpen={emptyRecycleBin} title={recycleFull ? text.emptyRecycleBin : text.recycleBinEmpty} />
            <DesktopIcon label={text.themes} glyph="▧" onOpen={() => openMuseum()} />
            <DesktopIcon label={text.language} glyph="A文" onOpen={() => openLanguage()} />
          </div>
          {selectionBox && <div className="desktop-selection-box" style={{ left: Math.min(selectionBox.startX, selectionBox.x), top: Math.min(selectionBox.startY, selectionBox.y), width: Math.abs(selectionBox.x - selectionBox.startX), height: Math.abs(selectionBox.y - selectionBox.startY) }} />}
          {windowStatus === 'open' && <MuseumWindow
            themes={themes}
            selected={theme}
            onSelect={selectTheme}
            onImport={loadThemeFolder}
            onLoadLocal={loadLocalThemeFolder}
            locale={locale}
            active={activeWindow === 'themes'}
            onActivate={() => setActiveWindow('themes')}
            importing={importing}
            importSource={importSource}
            importError={importError}
            onClose={closeMuseum}
            onMinimize={minimizeMuseum}
            maximized={maximized}
            onToggleMaximize={toggleMaximize}
            geometry={windowGeometry}
            onGeometryChange={setWindowGeometry}
            onPlaySound={playSound}
            activeCursor={activeCursor}
            onCursorSelect={setActiveCursor}
            soundError={soundError}
          />}
          {languageStatus === 'open' && <LanguageWindow locale={locale} preference={languagePreference} active={activeWindow === 'language'} onActivate={() => setActiveWindow('language')} onSelect={selectLanguage} onMinimize={minimizeLanguage} onClose={closeLanguage} />}
          {computerStatus === 'open' && <ComputerWindow locale={locale} location={explorerLocation} active={activeWindow === 'computer'} onActivate={() => setActiveWindow('computer')} onMinimize={minimizeComputer} onClose={closeComputer} />}
          {startOpen && <div onClick={(event) => event.stopPropagation()}><StartMenu locale={locale} onOpenComputer={() => openComputer('computer')} onOpenThemes={() => openMuseum(true)} onOpenLanguage={() => openLanguage(true)} /></div>}
          <div onClick={(event) => event.stopPropagation()}><Taskbar
            items={[
              ...(windowStatus !== 'closed' ? [{ id: 'themes', label: text.themes, glyph: '▧', active: windowStatus === 'open' && activeWindow === 'themes', onClick: toggleTaskbarWindow }] : []),
              ...(languageStatus !== 'closed' ? [{ id: 'language', label: text.language, glyph: 'A文', active: languageStatus === 'open' && activeWindow === 'language', onClick: toggleLanguageWindow }] : []),
              ...(computerStatus !== 'closed' ? [{ id: 'computer', label: explorerLocation === 'computer' ? text.computer : explorerLocation === 'documents' ? text.documents : text.network, icon: '/icons/computer.png', active: computerStatus === 'open' && activeWindow === 'computer', onClick: toggleComputerWindow }] : []),
            ]}
            locale={locale}
            startOpen={startOpen}
            onToggleStart={toggleStartMenu}
          /></div>
          {animatedCursorSrc && <AnimatedPointer key={animatedCursorSrc} src={animatedCursorSrc} onReadyChange={setAnimatedPointerReady} />}
        </main>
      </div>
    </div>
  );
}
