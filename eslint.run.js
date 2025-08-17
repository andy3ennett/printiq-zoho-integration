import { ESLint } from 'eslint';

async function main() {
  const eslint = new ESLint({});
  const results = await eslint.lintFiles(['**/*.{js,ts}']);
  const formatter = await eslint.loadFormatter('stylish');
  const resultText = formatter.format(results);

  if (resultText) {
    console.log(resultText);
  }

  const hasErrors = results.some(result => result.errorCount > 0);
  if (hasErrors) {
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
