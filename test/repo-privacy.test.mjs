import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

// Repo public: không được chứa app token hay đường dẫn Base thật
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SKIP_DIRS = new Set(['.git', '.superpowers', 'tmp', '__pycache__', 'node_modules']);
const APP_TOKEN = /\b(?=[A-Za-z0-9]*[A-Z])(?=[A-Za-z0-9]*[a-z])[A-Za-z0-9]{27}\b/g;
const BASE_URL = /[a-z0-9]+\.(?:sg\.)?larksuite\.com\/(?:base|wiki)\/[A-Za-z0-9]{20,}/g;

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return SKIP_DIRS.has(name) ? [] : listFiles(path);
    return name === '.DS_Store' ? [] : [path];
  });
}

test('repo không chứa app token hay đường dẫn Base thật', () => {
  const leaks = listFiles(ROOT).flatMap((path) => {
    const content = readFileSync(path, 'utf8');
    return [...content.matchAll(APP_TOKEN), ...content.matchAll(BASE_URL)].map((match) => `${relative(ROOT, path)}: ${match[0]}`);
  });
  assert.deepEqual(leaks, []);
});
