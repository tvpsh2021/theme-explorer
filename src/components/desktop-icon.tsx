type DesktopIconProps = {
  label: string;
  src?: string;
  glyph?: string;
  onOpen: () => void;
  title?: string;
};

export function DesktopIcon({ label, src, glyph, onOpen, title }: DesktopIconProps) {
  return (
    <button className="desktop-icon" type="button" onClick={onOpen} title={title ?? `Open ${label}`}>
      {src ? <img src={src} alt="" /> : <span className="desktop-icon-glyph" aria-hidden="true">{glyph}</span>}
      <span>{label}</span>
    </button>
  );
}
