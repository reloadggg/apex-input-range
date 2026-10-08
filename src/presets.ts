import provided from './provided-configs.json';
import { parseApexConfigs, mergeImported } from './apexConfig';
import { DEFAULT_SETTINGS, normalizeSettings, loadJson } from './engine';
import type { Settings } from './engine';

export const providedBefore = parseApexConfigs(provided.before);
export const providedAfter = parseApexConfigs(provided.after);
export const PROVIDED_REVISION = 'local-profile-2026-10-09';
export function applyProvided(settings: Settings): Settings {
  return { ...settings, bindings: mergeImported(settings.bindings, providedAfter), previousBindings: mergeImported(settings.previousBindings, providedBefore),
    currentSource: providedAfter.sources.join(' + '), previousSource: providedBefore.sources.join(' + '), previousReady: true, schemaVersion: 2, providedRevision: PROVIDED_REVISION };
}
export function initialSettings(): Settings {
  const saved = loadJson('input-range-settings');
  const normalized = normalizeSettings(saved);
  if (normalized.providedRevision === PROVIDED_REVISION) return normalized;
  return { ...applyProvided({ ...DEFAULT_SETTINGS, ...normalized }), mode: 'adapt' };
}
