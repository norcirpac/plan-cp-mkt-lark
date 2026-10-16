import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createLarkClient } from '../js/lark/client.js';
import { vnTimestamp } from '../js/lark/mapper.js';
import { createStore } from '../js/store.js';
import { createFakeBitable, text } from './helpers/fake-bitable.mjs';

const NOW = Date.UTC(2026, 9, 16, 3, 4, 5); // 10:04:05 giờ VN

function setup() {
  const fake = createFakeBitable();
  fake.tables.nhansu.seed({ 'Tên': text('Giang'), 'Người': [{ id: 'u_giang' }] });
  const store = createStore({ client: createLarkClient(fake.bitable), now: () => NOW });
  return { store, tables: fake.tables };
}

const save = (type, obj) => ({ op: 'save', type, obj });
const del = (type, id) => ({ op: 'del', type, id });

test('thêm việc mới: đủ cột, người dùng theo Nhân sự, capNhat giờ VN', async () => {
  const { store, tables } = setup();
  const obj = { id: 'v1', viec: 'Đăng mã', ngay: '2026-10-16', ca: 'Sáng', nguoi: 'Giang', caCa: '', soLuong: '2', trangThai: 'Chưa làm' };
  const result = await store.batch([save('viec', obj)]);
  assert.deepEqual(result, { done: 1 });
  const values = tables.viec.valuesOf(tables.viec.records[0].recordId);
  assert.deepEqual(values['Việc'], text('Đăng mã'));
  assert.equal(values['Ngày'], vnTimestamp('2026-10-16', false));
  assert.equal(values['Ca'].text, 'Sáng');
  assert.deepEqual(values['Người'], [{ id: 'u_giang' }]);
  assert.deepEqual(values['Tên người (gốc)'], text('Giang'));
  assert.equal(values['Cả ca'], false);
  assert.equal(values['Số bài dự kiến'], 2);
  assert.deepEqual(values.capNhat, text('2026-10-16T10:04:05'));
  assert.equal(values['Ghi chú'], null);
  assert.equal(obj.capNhat, undefined, 'không sửa object của app');
});

test('lựa chọn chưa có thì thêm vào cột rồi ghi', async () => {
  const { store, tables } = setup();
  await store.batch([save('viec', { id: 'v1', viec: 'x', ngay: '2026-10-16', kenh: 'Kênh mới, Fanpage Nô Tì' })]);
  const addOptionCalls = tables.viec.calls.filter((call) => call.method === 'addOption').map((call) => call.name);
  assert.deepEqual(addOptionCalls.sort(), ['Fanpage Nô Tì', 'Kênh mới']);
  const values = tables.viec.valuesOf(tables.viec.records[0].recordId);
  assert.deepEqual(values['Kênh'].map((option) => option.text), ['Kênh mới', 'Fanpage Nô Tì']);
});

test('bài tạo cùng lô với việc nhận được record_id của việc', async () => {
  const { store, tables } = setup();
  await store.batch([
    save('bai', { id: 'b1', viecId: 'v1', stt: '1', ngay: '2026-10-16' }),
    save('viec', { id: 'v1', viec: 'Đăng mã', ngay: '2026-10-16' }),
  ]);
  const viecRecordId = tables.viec.records[0].recordId;
  const link = tables.bai.valuesOf(tables.bai.records[0].recordId)['Việc'];
  assert.deepEqual(link.recordIds, [viecRecordId]);
  assert.equal(link.tableId, 'tbl_viec');
});

test('id đã có trên Lark (người khác vừa tạo) thì sửa, không tạo trùng', async () => {
  const { store, tables } = setup();
  const recordId = tables.bangiao.seed({ id: text('bg1'), 'Ghi chú': text('cũ') });
  await store.batch([save('bangiao', { id: 'bg1', ghiChu: 'mới', ngay: '2026-10-16' })]);
  assert.equal(tables.bangiao.records.length, 1);
  assert.deepEqual(tables.bangiao.valuesOf(recordId)['Ghi chú'], text('mới'));
});

test('bản ghi tạo tay (id = record_id) được sửa đúng chỗ và được ghi id', async () => {
  const { store, tables } = setup();
  tables.bangiao.seed({ 'Ghi chú': text('tạo tay'), 'Ngày': vnTimestamp('2026-10-16', false) }, 'rec_manual');
  const data = await store.range('2026-10-16', '2026-10-16');
  const manual = data.banGiao.find((row) => row.id === 'rec_manual');
  await store.batch([save('bangiao', { ...manual, ghiChu: 'đã sửa' })]);
  assert.equal(tables.bangiao.records.length, 1);
  assert.deepEqual(tables.bangiao.valuesOf('rec_manual').id, text('rec_manual'));
  assert.deepEqual(tables.bangiao.valuesOf('rec_manual')['Ghi chú'], text('đã sửa'));
});

test('trùng id trong một lô thì giữ bản cuối', async () => {
  const { store, tables } = setup();
  await store.batch([save('bangiao', { id: 'bg1', ghiChu: 'a' }), save('bangiao', { id: 'bg1', ghiChu: 'b' })]);
  assert.equal(tables.bangiao.records.length, 1);
  assert.deepEqual(tables.bangiao.valuesOf(tables.bangiao.records[0].recordId)['Ghi chú'], text('b'));
});

test('lô lớn được chia nhóm 100', async () => {
  const { store, tables } = setup();
  const ops = Array.from({ length: 250 }, (_, i) => save('bangiao', { id: `bg${i}`, ghiChu: `n${i}` }));
  const result = await store.batch(ops);
  assert.equal(result.done, 250);
  assert.deepEqual(tables.bangiao.calls.filter((call) => call.method === 'addRecords').map((call) => call.size), [100, 100, 50]);
});

test('xoá: id có thì xoá và đếm, id không có thì bỏ qua', async () => {
  const { store, tables } = setup();
  tables.bangiao.seed({ id: text('bg1') });
  const result = await store.batch([del('bangiao', 'bg1'), del('bangiao', 'khong-co')]);
  assert.deepEqual(result, { done: 1 });
  assert.equal(tables.bangiao.records.length, 0);
});

test('sửa rồi xoá cùng id trong một lô thì chỉ xoá', async () => {
  const { store, tables } = setup();
  tables.bangiao.seed({ id: text('bg1') });
  await store.batch([save('bangiao', { id: 'bg1', ghiChu: 'x' }), del('bangiao', 'bg1')]);
  assert.equal(tables.bangiao.calls.filter((call) => call.method === 'setRecords').length, 0);
  assert.equal(tables.bangiao.records.length, 0);
});

test('type không ghi được thì báo lỗi, không ghi gì', async () => {
  const { store, tables } = setup();
  await assert.rejects(() => store.batch([save('bangiao', { id: 'a' }), save('nhansu', { ten: 'X' })]), /Không ghi được nhansu/);
  assert.equal(tables.bangiao.records.length, 0);
});

test('Lark lỗi khi ghi thì báo rõ bảng, thao tác, số bản ghi và giữ lỗi gốc', async () => {
  const { store, tables } = setup();
  tables.bangiao.failNext = 'addRecords';
  const error = await store.batch([save('bangiao', { id: 'a' }), save('bangiao', { id: 'b' })]).catch((caught) => caught);
  assert.match(error.message, /Lưu bảng "Bàn giao" lỗi khi thêm 2 bản ghi: fake addRecords lỗi/);
  assert.match(error.cause.message, /fake addRecords lỗi/);
});

test('phiên khác vừa thêm lựa chọn thì không thêm trùng lần nữa', async () => {
  const fake = createFakeBitable();
  fake.tables.nhansu.seed({ 'Tên': text('Giang'), 'Người': [{ id: 'u_giang' }] });
  const storeA = createStore({ client: createLarkClient(fake.bitable), now: () => NOW });
  const storeB = createStore({ client: createLarkClient(fake.bitable), now: () => NOW });
  const viec = (id) => ({ id, viec: 'Đăng mã', ngay: '2026-10-16', ca: 'Sáng', nhom: 'Sale 11/11' });
  // B đã nạp meta của bảng Việc từ trước, lúc chưa có lựa chọn "Sale 11/11"
  await storeB.batch([save('viec', { id: 'v0', viec: 'Cũ', ngay: '2026-10-16', ca: 'Sáng' })]);
  await storeA.batch([save('viec', viec('v1'))]);
  await storeB.batch([save('viec', viec('v2'))]);
  const nhom = fake.tables.viec.fields.find((field) => field.name === 'Nhóm');
  assert.deepEqual(nhom.property.options.map((option) => option.name), ['Sale 11/11']);
});
