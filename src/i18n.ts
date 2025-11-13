import { moment } from 'obsidian';
import en from './l10n/en.json';
import es from './l10n/es.json';

const locales: Record<string, typeof en> = {
  en,
  es,
};

let translations: typeof en;

export const loadLanguage = (): void => {
  const lang = moment.locale();
  const langCode = lang.split('-')[0];
  const langStrings = locales[langCode] || en;
  translations = { ...en, ...langStrings };
};

export const t = (key: keyof typeof en): string => {
  return translations?.[key] ?? key;
};
