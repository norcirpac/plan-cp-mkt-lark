import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadApp } from './helpers/load-app.mjs';

function setup() {
  const app = loadApp({ nowIso: '2026-10-16T10:00:00+07:00' });
  app.run(`
    globalThis.__calls = { toasts: [], batches: [] };
    toast = (msg, err) => { __calls.toasts.push({ msg, err: !!err }); };
    render = () => {};
    canAutoRefresh = () => true;
    scheduleReload = () => { __calls.reloadScheduled = true; };
    window.PlanStore = { range: null, batch: async (ops) => { __calls.batches.push(ops); return { done: ops.length }; } };
  `);
  return app;
}

test('bàn giao tạo tay trong Lark: sửa trong app ghi vào đúng bản ghi đó', async () => {
  const app = setup();
  app.run(`S.banGiao = [{ id: 'rec_tay', ngay: S.date, ca: S.ca, mang: 'Shopee', ghiChu: 'cũ' }];`);
  await app.run(`saveBanGiao('Shopee', 'mới')`);
  const [[op]] = app.json('__calls.batches');
  assert.equal(op.obj.id, 'rec_tay');
  assert.equal(app.run('S.banGiao.length'), 1);
});

test('phân công tạo tay trong Lark: sửa trong app giữ id bản ghi cũ', () => {
  const app = setup();
  app.run(`S.macDinh = [{ id: 'rec_pc', ca: 'Tối', mang: 'Shopee', nguoi: 'Hoa' }];`);
  assert.equal(app.json(`macDinhOp('Tối', 'Shopee', 'Bình')`).obj.id, 'rec_pc');
  assert.equal(app.json(`macDinhOp('Tối', 'Lazada', 'Bình')`).obj.id, 'Tối|Lazada');
});

test('chỉ có quyền xem: xoá không báo "Đã xoá", chỉ báo lý do', async () => {
  const app = setup();
  app.run(`APP_ENV.readOnly = true; S.viec = [{ id: 'v1', viec: 'x' }];`);
  await app.run(`delWithUndo([{ type: 'viec', obj: S.viec[0] }], 'việc')`);
  const { toasts, batches } = app.json('__calls');
  assert.equal(batches.length, 0);
  assert.equal(app.run('S.viec.length'), 1);
  assert.ok(!toasts.some((t) => /Đã xoá/.test(t.msg)), JSON.stringify(toasts));
  assert.ok(toasts.some((t) => /chỉ có quyền xem/.test(t.msg)));
});

test('tải lại đang chạy thì có lần lưu: không đè thay đổi vừa lưu, hẹn tải lại', async () => {
  const app = setup();
  app.run(`window.PlanStore.range = () => new Promise((resolve) => { globalThis.__resolveRange = resolve; });`);
  app.run(`globalThis.__loading = load(true);`);
  await app.run(`commit([sv('bangiao', { id: 'b1', ngay: S.date, ca: S.ca, mang: 'Shopee', ghiChu: 'vừa gõ' })])`);
  app.run(`__resolveRange({ banGiao: [], viec: [], chuDe: [], bai: [] });`);
  await app.run('__loading');
  assert.equal(app.run('S.banGiao.length'), 1);
  assert.equal(app.run('__calls.reloadScheduled'), true);
});

test('hai lần tải về sai thứ tự: giữ kết quả của lần tải sau', async () => {
  const app = setup();
  app.run(`globalThis.__resolvers = []; window.PlanStore.range = () => new Promise((resolve) => { __resolvers.push(resolve); });`);
  app.run(`globalThis.__first = load(); globalThis.__second = load();`);
  app.run(`__resolvers[1]({ viec: [{ id: 'moi' }] });`);
  await app.run('__second');
  app.run(`__resolvers[0]({ viec: [{ id: 'cu' }] });`);
  await app.run('__first');
  assert.equal(app.run('S.viec[0].id'), 'moi');
});

test('toast lỗi giữ lâu hơn toast thường để kịp đọc', () => {
  const app = loadApp({ nowIso: '2026-10-16T10:00:00+07:00' });
  app.run(`globalThis.__delays = []; setTimeout = (fn, ms) => { __delays.push(ms); return 0; };`);
  app.run(`toast('Đã lưu'); toast('Lưu lỗi: mất mạng', true);`);
  const [normal, error] = app.json('__delays');
  assert.ok(error >= 8000, `toast lỗi chỉ ${error} ms`);
  assert.ok(normal < error);
});
