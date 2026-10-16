import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createLarkClient } from '../js/lark/client.js';
import { createFakeBitable, text } from './helpers/fake-bitable.mjs';

test('readRecords đọc hết các trang và đổi field id sang tên cột', async () => {
  const { bitable, tables } = createFakeBitable();
  for (let i = 0; i < 450; i++) tables.bangiao.seed({ id: text(`bg${i}`) });
  const client = createLarkClient(bitable);
  const records = await client.readRecords('bangiao');
  assert.equal(records.length, 450);
  assert.deepEqual(records[0].fields.id, text('bg0'));
  assert.equal(tables.bangiao.calls.filter((call) => call.method === 'getRecordsByPage').length, 3);
});

test('readRecords truyền bộ lọc xuống SDK', async () => {
  const { bitable, tables } = createFakeBitable();
  tables.bangiao.seed({ id: text('a') });
  tables.bangiao.seed({ id: text('b') });
  const client = createLarkClient(bitable);
  const fieldId = await client.fieldId('bangiao', 'id');
  const records = await client.readRecords('bangiao', { conjunction: 'or', conditions: [{ fieldId, operator: 'is', value: 'b' }] });
  assert.deepEqual(records.map((record) => record.fields.id), [text('b')]);
});

test('addRecords chia nhóm 100 và trả record_id đúng thứ tự', async () => {
  const { bitable, tables } = createFakeBitable();
  const client = createLarkClient(bitable);
  const list = Array.from({ length: 250 }, (_, i) => ({ id: text(`n${i}`) }));
  const ids = await client.addRecords('bangiao', list);
  assert.equal(ids.length, 250);
  assert.deepEqual(tables.bangiao.calls.filter((call) => call.method === 'addRecords').map((call) => call.size), [100, 100, 50]);
  assert.deepEqual(tables.bangiao.valuesOf(ids[249]).id, text('n249'));
});

test('setRecords và deleteRecords', async () => {
  const { bitable, tables } = createFakeBitable();
  const recordId = tables.bangiao.seed({ id: text('x'), 'Ghi chú': text('cũ') });
  const client = createLarkClient(bitable);
  await client.setRecords('bangiao', [{ recordId, fields: { 'Ghi chú': text('mới') } }]);
  assert.deepEqual(tables.bangiao.valuesOf(recordId)['Ghi chú'], text('mới'));
  await client.deleteRecords('bangiao', [recordId]);
  assert.equal(tables.bangiao.records.length, 0);
});

test('cột không tồn tại báo lỗi có tên bảng và tên cột', async () => {
  const { bitable } = createFakeBitable();
  const client = createLarkClient(bitable);
  await assert.rejects(() => client.addRecords('bangiao', [{ 'Cột lạ': text('x') }]), /Bàn giao.*Cột lạ/);
});

test('findOption / addOption', async () => {
  const { bitable, tables } = createFakeBitable();
  tables.viec.option('Ca', 'Sáng');
  const client = createLarkClient(bitable);
  assert.deepEqual(await client.findOption('viec', 'Ca', 'Sáng'), { id: 'opt_viec_f3_0', text: 'Sáng' });
  assert.equal(await client.findOption('viec', 'Ca', 'Đêm'), null);
  const added = await client.addOption('viec', 'Ca', 'Đêm');
  assert.equal(added.text, 'Đêm');
  assert.deepEqual(await client.findOption('viec', 'Ca', 'Đêm'), added);
});

test('canEdit, currentUserId, onChange', async () => {
  const { bitable, tables } = createFakeBitable({ userId: 'u_ngoc', canEdit: false });
  const client = createLarkClient(bitable);
  assert.equal(await client.canEdit(), false);
  assert.equal(await client.currentUserId(), 'u_ngoc');
  let count = 0;
  const off = await client.onChange(['viec', 'bai'], () => { count++; });
  tables.viec.emit('modify', { recordId: 'r1', fieldIds: [] });
  tables.bai.emit('add', 'r2');
  off();
  tables.viec.emit('delete', 'r1');
  assert.equal(count, 2);
});
