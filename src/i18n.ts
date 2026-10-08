import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import { cloneElement, isValidElement } from 'react';
import type { ReactNode } from 'react';
import en from './locales/en.json';
import ja from './locales/ja.json';

export type Language = 'zh-CN' | 'en' | 'ja';
export const LANGUAGE_STORAGE_KEY = 'input-range-language';
export function validLanguage(value: unknown): Language { return value === 'en' || value === 'ja' ? value : 'zh-CN'; }
function savedLanguage(): Language {
  try { return validLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY)); } catch { return 'zh-CN'; }
}
void i18n.use(initReactI18next).init({
  resources: { 'zh-CN': { translation: {} }, en: { translation: en }, ja: { translation: ja } },
  lng: savedLanguage(), fallbackLng: 'zh-CN', supportedLngs: ['zh-CN', 'en', 'ja'],
  keySeparator: false, nsSeparator: false, interpolation: { escapeValue: false },
});

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Keep persisted action names and parser messages canonical. Translate them only
// when displayed, including parameterized messages produced by older versions.
const patterns = Object.keys(en).filter(key => /\{\{\d+\}\}/.test(key)).map(key => ({
  key, weight: key.replace(/\{\{\d+\}\}/g, '').length,
  ids: [...key.matchAll(/\{\{(\d+)\}\}/g)].map(match => match[1]),
  regex: new RegExp('^' + key.split(/(\{\{\d+\}\})/).map(part => /^\{\{\d+\}\}$/.test(part) ? '(.*?)' : escapeRegex(part)).join('') + '$', 'u'),
})).sort((a, b) => b.weight - a.weight);

export function tx(value: string | null | undefined, depth = 0): string {
  if (!value || i18n.language === 'zh-CN') return value ?? '';
  if (Object.hasOwn(en, value)) return i18n.t(value);
  const trimmed = value.trim();
  if (trimmed !== value && Object.hasOwn(en, trimmed)) return value.replace(trimmed, i18n.t(trimmed));
  if (depth > 8) return value;
  for (const pattern of patterns) {
    const match = value.match(pattern.regex);
    if (match) return i18n.t(pattern.key, Object.fromEntries(pattern.ids.map((id, index) => [id, tx(match[index + 1], depth + 1)])));
  }
  // These separators describe button sequences and saved result summaries,
  // rather than natural-language lists. Preserve their visual order.
  const segments = value.split(/( → | ↔ | · |；)/);
  if (segments.length > 1) return segments.map((segment, index) => index % 2 ? segment : tx(segment, depth + 1)).join('');
  return value;
}

/** Translate string children at the React render boundary; never mutate the DOM
 * or stored bindings, file names, field values, event handlers or component IDs. */
export function localize(value: ReactNode): ReactNode {
  if (typeof value === 'string') return tx(value);
  if (Array.isArray(value)) return value.map(localize);
  return value;
}

/** Localize a component's rendered tree. Custom components localize their own
 * output. Only text and accessibility labels change; input values stay intact. */
export function localizeTree(value: ReactNode): ReactNode {
  if (typeof value === 'string') return tx(value);
  if (Array.isArray(value)) return value.map(localizeTree);
  if (!isValidElement<Record<string, unknown>>(value)) return value;
  if (value.props.translate === 'no') return value;
  const props: Record<string, unknown> = {};
  for (const key of ['aria-label', 'title', 'placeholder', 'alt']) {
    if (typeof value.props[key] === 'string') props[key] = tx(value.props[key]);
  }
  if ('children' in value.props) props.children = localizeTree(value.props.children as ReactNode);
  return cloneElement(value, props);
}

export function formatDate(value: string | Date, dateOnly = false): string {
  // Tutorial dates are calendar dates, not UTC instants. Keep the same day in
  // western time zones; session timestamps continue to use the local time zone.
  const date = dateOnly && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`) : new Date(value);
  return new Intl.DateTimeFormat(i18n.language || 'zh-CN', dateOnly
    ? { year: 'numeric', month: 'short', day: 'numeric' }
    : { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
}

export function useLanguage() {
  const { i18n: instance } = useTranslation();
  return { language: validLanguage(instance.language), setLanguage: (value: string) => { void instance.changeLanguage(validLanguage(value)); } };
}
export default i18n;
