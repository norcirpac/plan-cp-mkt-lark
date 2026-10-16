import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { loadApp } from './helpers/load-app.mjs';

// Phần script của legacy/Index.html đã tách sang js/app/*.js (dòng 315–1967)
const LEGACY_SCRIPT_FIRST_LINE = 315;
const LEGACY_SCRIPT_LAST_LINE = 1967;

// Bỏ có chủ đích: dữ liệu mẫu/seed và lớp gọi Apps Script, thay bằng PlanStore
const DROPPED_ON_PURPOSE = ['NAMES', 'TPL', 'DEF_PC', 'seedDb', 'Demo', 'GAS', 'online', 'gasCall', 'apiGet', 'apiPing', 'poolFor'];

function legacyTopLevelNames() {
  const lines = readFileSync(new URL('../legacy/Index.html', import.meta.url), 'utf8')
    .split('\n')
    .slice(LEGACY_SCRIPT_FIRST_LINE - 1, LEGACY_SCRIPT_LAST_LINE);
  const names = lines.flatMap((line) => {
    const match = line.match(/^(?:async\s+)?(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)/);
    return match ? [match[1]] : [];
  });
  return [...new Set(names)];
}

test('mọi khai báo cấp cao của legacy vẫn còn trong app, trừ phần bỏ có chủ đích', () => {
  const app = loadApp({ nowIso: '2026-10-16T10:00:00+07:00' });
  const isDeclared = (name) => app.run(`(() => { try { ${name}; return true; } catch (e) { return false; } })()`);
  const missing = legacyTopLevelNames().filter((name) => !DROPPED_ON_PURPOSE.includes(name) && !isDeclared(name));
  assert.deepEqual(missing, []);
});

test('tab Cài đặt hiển thị được khi có khối mẫu', () => {
  const app = loadApp({ nowIso: '2026-10-16T10:00:00+07:00' });
  app.run(`S.mau = [{ id: 'm1', chuDe: 'Mã 50%', khoi: 'Hằng ngày', mang: 'Shopee', nhom: 'Hằng ngày', thuTu: 1, viecJson: '[]' }];`);
  const html = app.run('renderCaiDat()');
  assert.match(html, /Khối mẫu \(1\)/);
});
