// Keeps the README's API documentation honest: every route in the code must be documented, and nothing extra.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function routesInCode() {
  const app = read('server/app.js');
  const found = new Set();
  for (const m of app.matchAll(/app\.get\('(\/api\/[^']*)'/g)) found.add(`GET ${m[1]}`);
  for (const m of app.matchAll(/app\.use\('(\/api\/[^']*)',\s*require\('\.\/routes\/([\w-]+)'\)\)/g)) {
    const [, mount, file] = m;
    for (const r of read(`server/routes/${file}.js`).matchAll(/router\.(get|post|put|delete)\(\s*'([^']*)'/g)) {
      found.add(`${r[1].toUpperCase()} ${mount}${r[2] === '/' ? '' : r[2]}`);
    }
  }
  return found;
}

const documented = () => new Set([...read('README.md').matchAll(/^#### `([A-Z]+ \/api\/[^`]*)`/gm)].map((m) => m[1]));

describe('API documentation', () => {
  it('finds the routes (guards against this test silently checking nothing)', () => {
    expect(routesInCode().size).toBeGreaterThanOrEqual(40);
  });
  it('documents every route in the README', () => {
    const docs = documented();
    expect([...routesInCode()].filter((r) => !docs.has(r))).toEqual([]);
  });
  it('does not document routes that no longer exist', () => {
    const code = routesInCode();
    expect([...documented()].filter((r) => !code.has(r))).toEqual([]);
  });
  it('lists every documented endpoint only once', () => {
    const all = [...read('README.md').matchAll(/^#### `([A-Z]+ \/api\/[^`]*)`/gm)].map((m) => m[1]);
    expect(all.length).toBe(new Set(all).size);
  });
});
