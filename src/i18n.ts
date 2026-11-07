export type Locale = 'zh-TW' | 'en';
export type LanguagePreference = 'browser' | Locale;

export const LANGUAGE_PREFERENCE_KEY = 'theme-explorer-language';

export function resolveBrowserLocale(): Locale {
  const languages = navigator.languages.length ? navigator.languages : [navigator.language];
  for (const language of languages) {
    const normalized = language.toLowerCase();
    if (normalized.startsWith('zh')) return 'zh-TW';
    if (normalized.startsWith('en')) return 'en';
  }
  return 'en';
}

export function resolveLocale(preference: LanguagePreference): Locale {
  return preference === 'browser' ? resolveBrowserLocale() : preference;
}

export function loadLanguagePreference(): LanguagePreference {
  let stored: string | null;
  try {
    stored = window.localStorage.getItem(LANGUAGE_PREFERENCE_KEY);
  } catch {
    // Storage can be blocked by browser privacy settings; following the browser language is the intended default.
    return 'browser';
  }
  return stored === 'zh-TW' || stored === 'en' ? stored : 'browser';
}

export const appCopy = {
  'zh-TW': {
    computer: '我的電腦',
    documents: '我的文件',
    network: '網路上的芳鄰',
    recycleBin: '資源回收桶',
    emptyRecycleBin: '清理資源回收桶',
    recycleBinEmpty: '資源回收桶是空的',
    themes: '佈景主題',
    language: '語言',
    start: '開始',
  },
  en: {
    computer: 'My Computer',
    documents: 'My Documents',
    network: 'Network Neighborhood',
    recycleBin: 'Recycle Bin',
    emptyRecycleBin: 'Empty Recycle Bin',
    recycleBinEmpty: 'The Recycle Bin is empty',
    themes: 'Themes',
    language: 'Language',
    start: 'Start',
  },
} as const;
