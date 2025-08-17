#!/usr/bin/env node
// eslint.run.js — strict, cross-platform wrapper around ESLint v9 via npx
import { spawnSync } from 'node:child_process';

const userArgs = process.argv.slice(2); // e.g. --fix
const args = ['-y', 'eslint@9', '.', '--max-warnings=0', ...userArgs];

const res = spawnSync('npx', args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(res.status ?? 1);
