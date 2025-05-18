import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const directoryPath = path.join(__dirname, '../sync');

// Recursively gather .js files
function getAllJsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getAllJsFiles(fullPath, fileList);
    } else if (file.endsWith('.js')) {
      fileList.push(fullPath);
    }
  });
  return fileList;
}

const jsFiles = getAllJsFiles(directoryPath);

const allExports = {};
const allImports = {};

jsFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const relativePath = file.replace(`${__dirname}/../`, '');

  const exportsMatch = [
    ...content.matchAll(
      /export\s+(?:default\s+)?(function|const|async function)?\s*([\w$]+)/g
    ),
    ...content.matchAll(/export\s*{\s*([^}]+)\s*}/g),
  ];
  const importsMatch = [
    ...content.matchAll(/import\s+(.*)\s+from\s+['"](.*)['"]/g),
  ];

  allExports[relativePath] = exportsMatch.map(m => m[2] || m[1]);
  allImports[relativePath] = importsMatch.map(m => m[2]);
});

console.log('🔍 All Exports:\n', allExports);
console.log('\n📦 All Imports:\n', allImports);

const unusedExports = [];

for (const [file, exports] of Object.entries(allExports)) {
  const flatImports = Object.values(allImports).flat();
  exports.forEach(fn => {
    const used = flatImports.some(i => i.includes(fn));
    if (!used) {
      unusedExports.push({ file, fn });
    }
  });
}

if (unusedExports.length === 0) {
  console.log('\n✅ No unused exports found.');
} else {
  console.warn('\n⚠️ Potential unused exports:');
  unusedExports.forEach(({ file, fn }) => {
    console.warn(`- ${fn} in ${file}`);
  });
}
