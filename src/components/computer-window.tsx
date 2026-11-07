import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Locale } from '../i18n';

export type ExplorerLocation = 'computer' | 'documents' | 'network';

type ComputerWindowProps = {
  locale: Locale;
  location: ExplorerLocation;
  active: boolean;
  onActivate: () => void;
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
    titles: { computer: '我的電腦', documents: '我的文件', network: '網路上的芳鄰' },
    file: '檔案', edit: '編輯', view: '檢視', help: '說明', up: '上一層', cut: '剪下', copy: '複製', paste: '貼上', address: '位址', drives: '磁碟機', floppy: '3.5 磁片 (A:)', noDisk: '尚未插入磁片', systemDisk: '系統碟 (C:)', diskSpace: '1.18 GB 可用，共 2.00 GB', documentsEmpty: '這是示範用的文件資料夾。', networkEmpty: '找不到區域網路上的其他電腦。', objects: '2 個物件', noObjects: '0 個物件', localDemo: '本機模擬內容', minimize: '最小化', close: '關閉',
  },
  en: {
    titles: { computer: 'My Computer', documents: 'My Documents', network: 'Network Neighborhood' },
    file: 'File', edit: 'Edit', view: 'View', help: 'Help', up: 'Up', cut: 'Cut', copy: 'Copy', paste: 'Paste', address: 'Address', drives: 'Drives', floppy: '3½ Floppy (A:)', noDisk: 'No disk inserted', systemDisk: 'System Disk (C:)', diskSpace: '1.18 GB free of 2.00 GB', documentsEmpty: 'This is a demonstration documents folder.', networkEmpty: 'No other computers were found on the local network.', objects: '2 objects', noObjects: '0 objects', localDemo: 'Local simulated content', minimize: 'Minimize ', close: 'Close ',
  },
};

export function ComputerWindow({ locale, location, active, onActivate, onMinimize, onClose }: ComputerWindowProps) {
  const windowRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [position, setPosition] = useState({ left: 154, top: 78 });
  const text = copy[locale];
  const title = text.titles[location];

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

  return (
    <section ref={windowRef} className="window computer-window" aria-label={title} style={{ left: position.left, top: position.top, zIndex: active ? 4 : 2 }} onPointerDownCapture={onActivate}>
      <div className="title-bar" onPointerDown={startDrag} onPointerMove={drag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onLostPointerCapture={stopDrag}>
        <div className="title-text"><img src="/icons/computer.png" alt="" />{title}</div>
        <div className="window-actions">
          <button type="button" aria-label={`${text.minimize}${title}`} onClick={onMinimize}><span className="control-glyph minimize-glyph" aria-hidden="true" /></button>
          <button type="button" aria-label={`${text.close}${title}`} onClick={onClose}><span className="control-glyph close-glyph" aria-hidden="true" /></button>
        </div>
      </div>
      <div className="menu-bar"><span>{text.file}</span><span>{text.edit}</span><span>{text.view}</span><span>{text.help}</span></div>
      <div className="explorer-toolbar"><span>{text.up}</span><span>{text.cut}</span><span>{text.copy}</span><span>{text.paste}</span></div>
      <div className="address-bar"><span>{text.address}</span><div><img src="/icons/computer.png" alt="" />{title}</div></div>
      <div className="explorer-content">
        {location === 'computer' && <>
          <p className="explorer-section-title">{text.drives}</p>
          <div className="drive-grid">
            <button type="button" className="drive-item">
              <img src="/icons/floppy-drive.png" alt="" />
              <span><strong>{text.floppy}</strong><small>{text.noDisk}</small></span>
            </button>
            <button type="button" className="drive-item">
              <img src="/icons/hard-drive.png" alt="" />
              <span><strong>{text.systemDisk}</strong><small>{text.diskSpace}</small><i><b /></i></span>
            </button>
          </div>
        </>}
        {location === 'documents' && <div className="empty-folder"><img src="/icons/documents.png" alt="" /><p>{text.documentsEmpty}</p></div>}
        {location === 'network' && <div className="empty-folder"><img src="/icons/network.png" alt="" /><p>{text.networkEmpty}</p></div>}
      </div>
      <div className="status-bar"><span>{location === 'computer' ? text.objects : text.noObjects}</span><span>{text.localDemo}</span></div>
    </section>
  );
}
