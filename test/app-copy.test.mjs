import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadApp } from './helpers/load-app.mjs';

function setup(execCommandResult) {
  const app = loadApp({ nowIso: '2026-10-16T10:00:00+07:00' });
  app.run(`
    globalThis.__calls = { toasts: [], modals: [] };
    toast = (msg, err) => { __calls.toasts.push({ msg, err: !!err }); };
    openModal = (html) => { __calls.modals.push(html); };
    document.body.appendChild = () => {};
    document.createElement = () => ({ style: {}, value: '', select() {}, remove() {} });
    document.execCommand = () => ${execCommandResult};
  `);
  return app;
}

// Trong iframe extension của Lark, execCommand('copy') trả về false chứ không ném lỗi
test('copy bị trình duyệt chặn: không báo đã copy, mở hộp chứa nội dung để copy tay', () => {
  const app = setup(false);
  app.run("copyText('Nhắc Khoa cập nhật')");
  const calls = app.json('__calls');
  assert.ok(!calls.toasts.some((t) => /Đã copy/.test(t.msg)), JSON.stringify(calls.toasts));
  assert.equal(calls.modals.length, 1);
  assert.match(calls.modals[0], /<textarea[^>]*>Nhắc Khoa cập nhật<\/textarea>/);
});

test('copy được thì báo đã copy, không mở hộp', () => {
  const app = setup(true);
  app.run("copyText('Nhắc Khoa cập nhật')");
  const calls = app.json('__calls');
  assert.ok(calls.toasts.some((t) => /Đã copy/.test(t.msg)));
  assert.equal(calls.modals.length, 0);
});
