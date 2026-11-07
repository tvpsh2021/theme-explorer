import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { LanguagePreference, Locale } from '../i18n';

type LanguageWindowProps = {
  locale: Locale;
  preference: LanguagePreference;
  active: boolean;
  onActivate: () => void;
  onSelect: (preference: LanguagePreference) => void;
  onMinimize: () => void;
  onClose: () => void;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  left: number;
  top: number;
};

const copy = {
  'zh-TW': {
    title: '語言',
    file: '檔案',
    help: '說明',
    heading: '選擇顯示語言',
    description: '變更桌面與程式介面的顯示語言。',
    browser: '瀏覽器預設',
    browserDescription: '依照瀏覽器的語言偏好自動選擇。',
    chinese: '繁體中文',
    english: 'English',
    status: '語言設定只會儲存在這台裝置的瀏覽器中',
    active: '使用中',
    minimize: '最小化語言視窗',
    close: '關閉語言視窗',
  },
  en: {
    title: 'Language',
    file: 'File',
    help: 'Help',
    heading: 'Choose a display language',
    description: 'Change the language used by the desktop and its programs.',
    browser: 'Browser default',
    browserDescription: 'Automatically follows your browser language preferences.',
    chinese: '繁體中文',
    english: 'English',
    status: 'The language setting is stored only in this browser',
    active: 'Active',
    minimize: 'Minimize Language',
    close: 'Close Language',
  },
} as const;

export function LanguageWindow({ locale, preference, active, onActivate, onSelect, onMinimize, onClose }: LanguageWindowProps) {
  const windowRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [position, setPosition] = useState({ left: 226, top: 126 });
  const text = copy[locale];

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.target instanceof Element && event.target.closest('.window-actions')) return;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, ...position };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function drag(event: ReactPointerEvent<HTMLDivElement>) {
    const state = dragRef.current;
    const desktop = windowRef.current?.parentElement;
    if (!state || state.pointerId !== event.pointerId || !desktop || !windowRef.current) return;
    const maxLeft = Math.max(0, desktop.clientWidth - windowRef.current.offsetWidth);
    const maxTop = Math.max(0, desktop.clientHeight - 40 - windowRef.current.offsetHeight);
    setPosition({
      left: Math.min(maxLeft, Math.max(0, state.left + event.clientX - state.startX)),
      top: Math.min(maxTop, Math.max(0, state.top + event.clientY - state.startY)),
    });
  }

  function stopDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  const options: { value: LanguagePreference; label: string; description?: string }[] = [
    { value: 'browser', label: text.browser, description: text.browserDescription },
    { value: 'zh-TW', label: text.chinese },
    { value: 'en', label: text.english },
  ];

  return (
    <section ref={windowRef} className="window language-window" aria-label={text.title} style={{ left: position.left, top: position.top, zIndex: active ? 4 : 2 }} onPointerDownCapture={onActivate}>
      <div className="title-bar" onPointerDown={startDrag} onPointerMove={drag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onLostPointerCapture={stopDrag}>
        <div className="title-text"><span className="language-glyph" aria-hidden="true">A文</span>{text.title}</div>
        <div className="window-actions">
          <button type="button" aria-label={text.minimize} onClick={onMinimize}><span className="control-glyph minimize-glyph" aria-hidden="true" /></button>
          <button type="button" aria-label={text.close} onClick={onClose}><span className="control-glyph close-glyph" aria-hidden="true" /></button>
        </div>
      </div>
      <div className="menu-bar"><span>{text.file}</span><span>{text.help}</span></div>
      <div className="language-content">
        <div className="language-heading">
          <span className="language-heading-icon" aria-hidden="true">A文</span>
          <div><h1>{text.heading}</h1><p>{text.description}</p></div>
        </div>
        <fieldset className="language-options">
          {options.map((option) => (
            <label key={option.value} className={preference === option.value ? 'selected' : ''}>
              <input type="radio" name="language" value={option.value} checked={preference === option.value} onChange={() => onSelect(option.value)} />
              <span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>
              {preference === option.value && <em>{text.active}</em>}
            </label>
          ))}
        </fieldset>
      </div>
      <div className="status-bar"><span>{text.status}</span><span>{text.title}</span></div>
    </section>
  );
}
