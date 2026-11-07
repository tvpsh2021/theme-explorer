import type { CursorId, DesktopIconId } from '../types/theme';

export const interactionSounds = {
  minimize: ['minimize', 'default-sound'],
  maximize: ['maximize', 'default-sound'],
  restoreDown: ['restore-down', 'default-sound'],
  restoreUp: ['restore-up', 'default-sound'],
  close: ['close-program', 'default-sound'],
  open: ['open-program', 'default-sound'],
  emptyRecycle: ['empty-recycle-bin', 'default-sound'],
  startOpen: ['menu-popup', 'default-sound'],
  startClose: ['menu-command', 'default-sound'],
  startLaunch: ['open-program', 'menu-command', 'default-sound'],
} as const;

export const iconLabels: Record<DesktopIconId, string> = {
  computer: 'Computer',
  documents: 'Documents',
  network: 'Network',
  recycleEmpty: 'Recycle Bin (Empty)',
  recycleFull: 'Recycle Bin (Full)',
};

export const cursorTypes: ReadonlyArray<{ id: CursorId; label: string }> = [
  { id: 'arrow', label: 'Normal Select' },
  { id: 'text', label: 'Text Select' },
  { id: 'help', label: 'Help Select' },
  { id: 'precision', label: 'Precision Select' },
  { id: 'alternate', label: 'Alternate Select' },
  { id: 'link', label: 'Link Select' },
  { id: 'handwriting', label: 'Handwriting' },
  { id: 'unavailable', label: 'Unavailable' },
  { id: 'move', label: 'Move' },
  { id: 'resizeNs', label: 'Vertical Resize' },
  { id: 'resizeWe', label: 'Horizontal Resize' },
  { id: 'resizeNwSe', label: 'Diagonal Resize 1' },
  { id: 'resizeNeSw', label: 'Diagonal Resize 2' },
  { id: 'busy', label: 'Busy' },
  { id: 'background', label: 'Working in Background' },
];

export const cursorKeys: Record<string, CursorId> = {
  arrow: 'arrow',
  ibeam: 'text',
  help: 'help',
  crosshair: 'precision',
  uparrow: 'alternate',
  hand: 'link',
  nwpen: 'handwriting',
  no: 'unavailable',
  sizeall: 'move',
  sizens: 'resizeNs',
  sizewe: 'resizeWe',
  sizenwse: 'resizeNwSe',
  sizenesw: 'resizeNeSw',
  wait: 'busy',
  appstarting: 'background',
};

export const soundEvents: Record<string, { id: string; label: string }> = {
  '.default': { id: 'default-sound', label: 'Default Sound' },
  appgpfault: { id: 'program-error', label: 'Program Error' },
  maximize: { id: 'maximize', label: 'Maximize' },
  menucommand: { id: 'menu-command', label: 'Menu Command' },
  menupopup: { id: 'menu-popup', label: 'Menu Popup' },
  minimize: { id: 'minimize', label: 'Minimize' },
  open: { id: 'open-program', label: 'Open Program' },
  close: { id: 'close-program', label: 'Close Program' },
  restoredown: { id: 'restore-down', label: 'Restore Down' },
  restoreup: { id: 'restore-up', label: 'Restore Up' },
  systemasterisk: { id: 'asterisk', label: 'Asterisk' },
  systemdefault: { id: 'beep', label: 'Beep' },
  systemexclamation: { id: 'exclamation', label: 'Exclamation' },
  systemexit: { id: 'exit', label: 'Exit' },
  systemhand: { id: 'critical-stop', label: 'Critical Stop' },
  systemquestion: { id: 'question', label: 'Question' },
  systemstart: { id: 'startup', label: 'Startup' },
  emptyrecyclebin: { id: 'empty-recycle-bin', label: 'Empty Recycle Bin' },
};
