import { useEffect, useState } from 'react';
import { appCopy, type Locale } from '../i18n';

export type TaskbarItem = {
  id: string;
  label: string;
  icon?: string;
  glyph?: string;
  active: boolean;
  onClick: () => void;
};

type TaskbarProps = {
  locale: Locale;
  items: TaskbarItem[];
  startOpen: boolean;
  onToggleStart: () => void;
};

export function Taskbar({ locale, items, startOpen, onToggleStart }: TaskbarProps) {
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <footer className="taskbar">
      <button type="button" className={`start-button ${startOpen ? 'pressed' : ''}`} aria-expanded={startOpen} onClick={onToggleStart}><span className="windows-mark">▦</span><strong>{appCopy[locale].start}</strong></button>
      <div className="taskbar-divider" />
      {items.map((item) => <button key={item.id} type="button" className={`task-button ${item.active ? 'active' : ''}`} onClick={item.onClick}>{item.icon ? <img src={item.icon} alt="" /> : <span>{item.glyph}</span>}{item.label}</button>)}
      <div className="taskbar-spacer" />
      <div className="tray"><span className="tray-speaker">◖))</span><time>{clock.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })}</time></div>
    </footer>
  );
}
