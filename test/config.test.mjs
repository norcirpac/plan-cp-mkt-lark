import assert from 'node:assert/strict';
import { test } from 'node:test';

import { TABLES, WRITABLE_TYPES, appKeysOf, idFieldOf } from '../js/config.js';

test('mọi bảng ghi được đều có cột id', () => {
  for (const type of WRITABLE_TYPES) assert.ok(idFieldOf(type), `${type} thiếu cột id`);
});

test('thứ tự ghi: chủ đề trước việc, việc trước bài', () => {
  assert.deepEqual(WRITABLE_TYPES, ['chude', 'viec', 'bai', 'bangiao', 'thuvien', 'mau', 'macdinh']);
});

test('id của phân công mặc định là cột "Ca | Mảng"', () => {
  assert.equal(idFieldOf('macdinh'), 'Ca | Mảng');
  assert.equal(idFieldOf('nhansu'), null);
});

test('appKeysOf bỏ khoá trùng (nguoi map vào 2 cột)', () => {
  const keys = appKeysOf('viec');
  assert.equal(keys.filter((key) => key === 'nguoi').length, 1);
  assert.ok(keys.includes('capNhat'));
});

test('tên bảng Lark đúng như trong Base', () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(TABLES).map(([type, table]) => [type, table.name])),
    {
      chude: 'Chủ đề', viec: 'Việc', bai: 'Bài đăng', bangiao: 'Bàn giao', thuvien: 'Thư viện',
      mau: 'Mẫu', macdinh: 'Phân công mặc định', nhansu: 'Nhân sự', danhmuc: 'Danh mục',
    },
  );
});
