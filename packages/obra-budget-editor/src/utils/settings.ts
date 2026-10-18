import { storeGet, storeSet } from './store';

export interface AppSettings {
  theme: string;
  locale: string;
  /**
   * Taal van afdrukken en PDF-rapporten. "auto" = volg de interfacetaal;
   * anders een taalcode uit LANGUAGES. Los van `locale`, zodat een bureau
   * met een Engelse interface toch Nederlandse rapporten kan afdrukken.
   */
  reportLocale: string;
  currency: string;
  autoSave: boolean;
  autoSaveInterval: number;
  recentFiles: string[];
}

const SETTINGS_KEY = 'settings';

export const defaultSettings: AppSettings = {
  theme: 'light',
  // Spanish (Paraguay) is the official language; a stored choice still wins.
  locale: 'es',
  reportLocale: 'auto',
  currency: 'PYG',
  autoSave: false,
  autoSaveInterval: 300000,
  recentFiles: [],
};

export async function loadSettings(): Promise<AppSettings> {
  const stored = await storeGet<AppSettings>(SETTINGS_KEY);
  return stored ? { ...defaultSettings, ...stored } : { ...defaultSettings };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await storeSet(SETTINGS_KEY, settings);
}
