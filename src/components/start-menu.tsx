import type { Locale } from '../i18n';

type StartMenuProps = {
  locale: Locale;
  onOpenComputer: () => void;
  onOpenThemes: () => void;
  onOpenLanguage: () => void;
};

const copy = {
  'zh-TW': { computer: '我的電腦', themes: '佈景主題', language: '語言', local: '本機佈景主題', private: '私人工作階段' },
  en: { computer: 'My Computer', themes: 'Themes', language: 'Language', local: 'LOCAL THEMES', private: 'PRIVATE SESSION' },
} as const;

export function StartMenu({ locale, onOpenComputer, onOpenThemes, onOpenLanguage }: StartMenuProps) {
  const text = copy[locale];
  return (
    <nav className="start-menu" aria-label="開始功能表">
      <div className="start-banner"><strong>DESKTOP</strong></div>
      <div className="start-items">
        <button type="button" onClick={onOpenComputer}><img src="/icons/computer.png" alt="" />{text.computer} <small>›</small></button>
        <div className="start-separator" />
        <button type="button" onClick={onOpenThemes}><span>▧</span>{text.themes} <small>›</small></button>
        <button type="button" onClick={onOpenLanguage}><span className="start-language-glyph">A文</span>{text.language} <small>›</small></button>
        <div className="start-menu-note">{text.local}<br />{text.private}</div>
      </div>
    </nav>
  );
}
