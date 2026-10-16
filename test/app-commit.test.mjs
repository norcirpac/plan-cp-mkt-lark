import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadApp } from './helpers/load-app.mjs';

function setup(batchImpl) {
  const app = loadApp({ nowIso: '2026-10-16T10:00:00+07:00' });
  app.run(`
    globalThis.__calls = { toasts: [], loads: 0, batches: 0 };
    toast = (msg, err) => { __calls.toasts.push({ msg, err: !!err }); };
    load = async () => { __calls.loads++; };
    render = () => {};
  `);
  app.run('window.PlanStore = { range: async () => ({}), batch: null };');
  app.run('window.PlanStore.batch = async (ops) => { __calls.batches++; return __batchImpl(ops); };');
  app.run(`globalThis.__batchImpl = ${batchImpl};`);
  return app;
}

const OP = "sv('bangiao', { id: 'bg1', ngay: '2026-10-16', ca: 'Sáng', mang: 'Shopee', ghiChu: 'x' })";

test('Lark lỗi khi lưu: báo lỗi đỏ nêu lý do rồi tải lại dữ liệu thật', async () => {
  const app = setup("async () => { throw new Error('Lưu bảng \"Bàn giao\" lỗi khi thêm 1 bản ghi: mất mạng'); }");
  await app.run(`commit([${OP}])`);
  const calls = app.json('__calls');
  assert.equal(calls.batches, 1);
  assert.equal(calls.loads, 1);
  assert.ok(calls.toasts.some((t) => t.err && /mất mạng/.test(t.msg) && /tải lại/.test(t.msg)), JSON.stringify(calls.toasts));
});

test('chỉ có quyền xem: không lưu, không đổi màn hình, báo lý do', async () => {
  const app = setup('async () => ({ done: 1 })');
  app.run('APP_ENV.readOnly = true;');
  await app.run(`commit([${OP}])`);
  const calls = app.json('__calls');
  assert.equal(calls.batches, 0);
  assert.equal(app.run('S.banGiao.length'), 0);
  assert.ok(calls.toasts.some((t) => t.err && /chỉ có quyền xem/.test(t.msg)));
});

test('lưu thành công thì gọi PlanStore.batch và hiện thông báo', async () => {
  const app = setup('async () => ({ done: 1 })');
  await app.run(`commit([${OP}], 'Đã lưu')`);
  const calls = app.json('__calls');
  assert.equal(calls.batches, 1);
  assert.equal(calls.loads, 0);
  assert.deepEqual(calls.toasts, [{ msg: 'Đã lưu', err: false }]);
});
