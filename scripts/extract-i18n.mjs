import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
const cjk = /[\u3400-\u9fff\uff00-\uffef\u3000-\u303f]/;
const entries = new Set();
for (const file of fs.readdirSync('src').filter(f => /\.tsx?$/.test(f))) {
  const source = ts.createSourceFile(file, fs.readFileSync(path.join('src', file), 'utf8'), ts.ScriptTarget.Latest, true);
  function visit(node) {
    let text;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) text = node.text;
    if (ts.isJsxText(node)) text = node.text.replace(/\s+/g, ' ').trim();
    if (ts.isTemplateExpression(node)) text = node.head.text + node.templateSpans.map((s,i) => `{{${i}}}` + s.literal.text).join('');
    if (text && cjk.test(text)) entries.add(text);
    ts.forEachChild(node, visit);
  }
  visit(source);
}
fs.mkdirSync('src/locales', { recursive: true });
fs.writeFileSync('src/locales/source.json', JSON.stringify([...entries], null, 2)+'\n');
console.log(`Extracted ${entries.size} messages`);
