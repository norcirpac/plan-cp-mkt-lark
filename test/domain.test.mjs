import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadApp } from './helpers/load-app.mjs';

const at = (nowIso) => loadApp({ nowIso });

test('ngày làm việc đổi lúc 05:00', () => {
  assert.equal(at('2026-10-17T04:59:00+07:00').run('workday()'), '2026-10-16');
  assert.equal(at('2026-10-17T05:00:00+07:00').run('workday()'), '2026-10-17');
});

test('ca hiện tại: 17:00 sang ca tối, qua nửa đêm vẫn là ca tối', () => {
  assert.equal(at('2026-10-16T16:59:00+07:00').run('curCa()'), 'Sáng');
  assert.equal(at('2026-10-16T17:00:00+07:00').run('curCa()'), 'Tối');
  assert.equal(at('2026-10-17T00:30:00+07:00').run('curCa()'), 'Tối');
});

test('giờ sau nửa đêm tính sang ngày hôm sau', () => {
  const app = at('2026-10-16T10:00:00+07:00');
  assert.equal(app.run("mins('01:00')"), 1500);
  assert.equal(app.run("mkDT('2026-10-16', '01:00')"), '2026-10-17 01:00');
  assert.equal(app.run("mkDT('2026-10-16', '23:00')"), '2026-10-16 23:00');
});

test('giờ nằm ngoài ca thì chuyển thành việc cả ca', () => {
  const app = at('2026-10-16T10:00:00+07:00');
  assert.deepEqual(app.json("fitShift('Sáng', '', '18:00', '19:00')"), { caCa: '1', batDau: '', ketThuc: '' });
  assert.deepEqual(app.json("fitShift('Sáng', '', '09:00', '10:00')"), { caCa: '', batDau: '09:00', ketThuc: '10:00' });
});

test('quá giờ: việc chưa xong của ngày trước', () => {
  const app = at('2026-10-16T10:00:00+07:00');
  assert.equal(app.run("isLate({ trangThai: 'Chưa làm', ngay: '2026-10-15', ca: 'Sáng' })"), true);
  assert.equal(app.run("isLate({ trangThai: 'Xong', ngay: '2026-10-15', ca: 'Sáng' })"), false);
  assert.equal(app.run("isLate({ trangThai: 'Trì hoãn', ngay: '2026-10-15', ca: 'Sáng' })"), false);
});
