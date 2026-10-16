import assert from 'node:assert/strict';
import { test } from 'node:test';

import { appScriptPaths, loadApp } from './helpers/load-app.mjs';

test('index.html nạp đủ 11 file giao diện theo đúng thứ tự', () => {
  assert.deepEqual(appScriptPaths(), [
    'js/app/util.js', 'js/app/api.js', 'js/app/state.js', 'js/app/render.js', 'js/app/cay.js', 'js/app/toi.js',
    'js/app/tiendo.js', 'js/app/caidat.js', 'js/app/widgets.js', 'js/app/modals.js', 'js/app/events.js',
  ]);
});

test('nạp app không lỗi và có đủ các hàm chính', () => {
  const app = loadApp({ nowIso: '2026-10-16T10:00:00+07:00' });
  for (const name of ['render', 'load', 'commit', 'toast', 'openModal', 'renderCay', 'renderToi', 'renderTienDo', 'renderCaiDat']) {
    assert.equal(app.run(`typeof ${name}`), 'function', name);
  }
  assert.equal(app.run('S.date'), '2026-10-16');
});
