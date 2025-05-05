const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..'); // project root
const scanDirs = ['sync', 'handlers', 'helpers', 'tests'];

const allFunctions = {};
const allExports = {};
const allImports = {};
const allFiles = [];

function walkDir(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (file.endsWith('.js')) {
      allFiles.push(fullPath);
    }
  });
}

// Scan all .js files
scanDirs.forEach(d => walkDir(path.join(baseDir, d)));

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const relPath = path.relative(baseDir, file);

  const functions = [...content.matchAll(/async function (\w+)/g)].map(
    m => m[1]
  );
  const exports = [
    ...content.matchAll(/module\.exports\s*=\s*{([^}]+)}/g),
  ].flatMap(m => m[1].split(',').map(e => e.trim()));
  const imports = [...content.matchAll(/require\(['"](.+)['"]\)/g)].map(
    m => m[1]
  );

  allFunctions[relPath] = functions;
  allExports[relPath] = exports;
  allImports[relPath] = imports;
}

// Identify unused exports
const importedFns = new Set();
Object.values(allImports).forEach(impArr => {
  impArr.forEach(mod => {
    if (!mod.startsWith('.')) return;
    const abs = path.resolve(baseDir, mod + '.js');
    const alt = abs.replace(/\.js$/, '/index.js');
    importedFns.add(path.relative(baseDir, abs));
    importedFns.add(path.relative(baseDir, alt));
  });
});

// Report
console.log('\n🔍 ANALYSIS REPORT');
console.log('=====================');
Object.entries(allExports).forEach(([file, exports]) => {
  const unused = exports.filter(
    e =>
      !Object.values(allImports)
        .flat()
        .some(i => i.includes(e))
  );
  if (unused.length) {
    console.log(`🟡 Possibly unused exports in ${file}: ${unused.join(', ')}`);
  }
});

const allFnDefs = Object.entries(allFunctions).flatMap(([f, fns]) =>
  fns.map(fn => ({ fn, file: f }))
);
const seen = new Map();
allFnDefs.forEach(({ fn, file }) => {
  if (!seen.has(fn)) seen.set(fn, []);
  seen.get(fn).push(file);
});
for (const [fn, files] of seen.entries()) {
  if (files.length > 1) {
    console.log(`🔁 Duplicate function "${fn}" found in: ${files.join(', ')}`);
  }
}

console.log('\n✅ Scan complete.\n');
