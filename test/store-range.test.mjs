import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createLarkClient } from '../js/lark/client.js';
import { vnTimestamp } from '../js/lark/mapper.js';
import { createStore, listDays } from '../js/store.js';
import { createFakeBitable, text } from './helpers/fake-bitable.mjs';

const day = (value) => vnTimestamp(value, false);

function setup() {
  const fake = createFakeBitable({ userId: 'u_giang' });
  const { tables } = fake;
  tables.nhansu.seed({ 'Tên': text('Giang'), 'Người': [{ id: 'u_giang', name: 'Giang' }] });
  tables.nhansu.seed({ 'Tên': text('Hoa') });
  tables.danhmuc.seed({ 'Kênh': text('Fanpage Nô Tì'), 'Lý do': text('Ốm') });
  tables.danhmuc.seed({ 'Dạng bài': text('Ảnh') });
  const status = (name) => tables.viec.option('Trạng thái', name);
  tables.viec.seed({ id: text('v1'), 'Việc': text('Đăng mã'), 'Ngày': day('2026-10-16'), 'Trạng thái': status('Chưa làm'), 'Cả ca': true });
  tables.viec.seed({ id: text('v2'), 'Việc': text('Hôm qua'), 'Ngày': day('2026-10-15'), 'Trạng thái': status('Xong') });
  tables.viec.seed({ id: text('v3'), 'Việc': text('Hoãn từ tuần trước'), 'Ngày': day('2026-10-09'), 'Trạng thái': status('Trì hoãn') });
  tables.viec.seed({ 'Việc': text('Tạo tay trong Lark'), 'Ngày': day('2026-10-16'), 'Trạng thái': status('Chưa làm') }, 'rec_manual');
  tables.macdinh.seed({}, 'rec_empty');
  tables.bai.seed({ id: text('b1'), viecId: text('v1'), 'Ngày': day('2026-10-16'), 'Thời điểm đăng': vnTimestamp('2026-10-17 00:30', true) });
  tables.bai.seed({ id: text('b3'), viecId: text('v3'), 'Ngày': day('2026-10-09') });
  tables.chude.seed({ id: text('cd1'), 'Chủ đề': text('Mã VIP'), 'Ngày': day('2026-10-16') });
  tables.chude.seed({ id: text('cd0'), 'Chủ đề': text('Cũ'), 'Ngày': day('2026-10-01') });
  tables.macdinh.seed({ 'Ca | Mảng': text('Sáng|Shopee'), 'Tên người (gốc)': text('Giang') });
  const store = createStore({ client: createLarkClient(fake.bitable) });
  return { store, tables };
}

test('range trả đúng dữ liệu trong ngày, chuỗi hoá giá trị', async () => {
  const { store } = setup();
  const data = await store.range('2026-10-16', '2026-10-16');
  assert.deepEqual(data.viec.map((v) => v.viec).sort(), ['Tạo tay trong Lark', 'Đăng mã']);
  const v1 = data.viec.find((v) => v.id === 'v1');
  assert.equal(v1.ngay, '2026-10-16');
  assert.equal(v1.caCa, '1');
  assert.equal(v1.ghiChu, '');
  assert.equal(data.bai[0].tgDang, '2026-10-17 00:30');
  assert.deepEqual(data.chuDe.map((c) => c.id), ['cd1']);
  assert.deepEqual(data.macDinh.map((m) => m.id), ['Sáng|Shopee']);
});

test('tồn đọng gồm việc trì hoãn mọi ngày và bài của chúng ngoài khoảng', async () => {
  const { store } = setup();
  const data = await store.range('2026-10-16', '2026-10-16');
  assert.deepEqual(data.tonDong.map((v) => v.id), ['v3']);
  assert.ok(!data.viec.some((v) => v.id === 'v3'));
  assert.deepEqual(data.tonDongBai.map((b) => b.id), ['b3']);
});

test('bản ghi tạo tay không có id thì dùng record_id làm id; bản ghi trống bị bỏ', async () => {
  const { store } = setup();
  const data = await store.range('2026-10-16', '2026-10-16');
  assert.ok(data.viec.some((v) => v.id === 'rec_manual'));
  assert.deepEqual(data.macDinh.map((m) => m.id), ['Sáng|Shopee']);
});

test('nhân sự và danh mục', async () => {
  const { store } = setup();
  const data = await store.range('2026-10-16', '2026-10-16');
  assert.deepEqual(data.nhanSu, [{ ten: 'Giang' }, { ten: 'Hoa' }]);
  assert.deepEqual(data.danhMuc, { kenh: ['Fanpage Nô Tì'], dangBai: ['Ảnh'], lyDo: ['Ốm'] });
  assert.deepEqual(store.people(), [{ ten: 'Giang', userId: 'u_giang' }, { ten: 'Hoa', userId: '' }]);
});

test('bảng lớn được lọc ngay khi hỏi Lark', async () => {
  const { store, tables } = setup();
  await store.range('2026-10-16', '2026-10-16');
  const chudeReads = tables.chude.calls.filter((call) => call.method === 'getRecordsByPage');
  assert.ok(chudeReads.every((call) => call.filter));
});

test('listDays', () => {
  assert.deepEqual(listDays('2026-10-30', '2026-11-02'), ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  assert.throws(() => listDays('2026-10-02', '2026-10-01'), /Khoảng ngày không hợp lệ/);
  assert.throws(() => listDays('2026-01-01', '2026-03-01'), /quá dài/);
});
