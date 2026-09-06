const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../src/components/salary/modals');
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
  const c = fs.readFileSync(path.join(dir, f), 'utf8');
  const used = [...c.matchAll(/Fi[A-Z][a-zA-Z0-9]*/g)].map((m) => m[0]);
  const importMatch = c.match(/import\s*\{([^}]+)\}\s*from\s*['"]react-icons\/fi['"]/);
  const imported = importMatch
    ? importMatch[1].split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const missing = [...new Set(used)].filter((u) => !imported.includes(u));
  if (missing.length) console.log(`${f}: ${missing.join(', ')}`);
}
