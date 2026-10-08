import fs from 'node:fs';
const en = {}, ja = {};
for (const [index, line] of fs.readFileSync('src/locales/messages.tsv', 'utf8').trimEnd().split(/\r?\n/).entries()) {
  const columns = line.split('\t');
  if (columns.length !== 3) throw Error(`Invalid translation row ${index + 1}`);
  const [key, english, japanese] = columns;
  if (key in en) throw Error(`Duplicate key: ${key}`);
  const placeholders = text => [...text.matchAll(/\{\{\d+\}\}/g)].map(match => match[0]).sort().join(',');
  if (!english.trim() || !japanese.trim() || placeholders(key) !== placeholders(english) || placeholders(key) !== placeholders(japanese)) throw Error(`Invalid translation or placeholders: ${key}`);
  en[key] = english; ja[key] = japanese;
}
const required = JSON.parse(fs.readFileSync('src/locales/source.json', 'utf8'));
const missing = required.filter(key => !(key in en));
if (missing.length) throw Error(`Missing translations: ${JSON.stringify(missing)}`);
for (const [language, messages] of Object.entries({ en, ja })) fs.writeFileSync(`src/locales/${language}.json`, JSON.stringify(messages, null, 2) + '\n');
console.log(`Built ${Object.keys(en).length} messages for English and Japanese`);
