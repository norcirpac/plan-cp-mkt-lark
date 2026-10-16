import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { TABLES } from '../js/config.js';
import { fromLark, splitList, toLark, vnDateString, vnNowStamp, vnTimestamp } from '../js/lark/mapper.js';

const ctx = {
  option: (fieldName, text) => (text === 'Không có' ? null : { id: `opt_${fieldName}_${text}`, text }),
  userId: (name) => ({ 'Giang': 'u_giang', 'Chi': 'u_chi' })[name] ?? null,
  recordId: (type, appId) => (type === 'viec' && appId === 'v1' ? 'rec_v1' : null),
  tableId: (type) => `tbl_${type}`,
};

test('ngày giờ VN quanh nửa đêm', () => {
  assert.equal(vnTimestamp('2026-10-16', false), Date.UTC(2026, 9, 15, 17, 0));
  assert.equal(fromLark('date', Date.UTC(2026, 9, 15, 17, 0)), '2026-10-16');
  assert.equal(fromLark('datetime', Date.UTC(2026, 9, 16, 16, 30)), '2026-10-16 23:30');
  assert.equal(fromLark('datetime', Date.UTC(2026, 9, 16, 17, 30)), '2026-10-17 00:30');
  assert.equal(toLark('datetime', '2026-10-17 00:30', ctx), Date.UTC(2026, 9, 16, 17, 30));
  assert.equal(toLark('datetime', '2026-10-17T00:30', ctx), Date.UTC(2026, 9, 16, 17, 30));
  assert.equal(toLark('date', '2026-10-17 00:30', ctx), Date.UTC(2026, 9, 16, 17, 0));
  assert.equal(vnDateString(Date.UTC(2026, 9, 16, 17, 30), true), '2026-10-17 00:30');
  assert.equal(vnNowStamp(Date.UTC(2026, 9, 16, 17, 5, 9)), '2026-10-17T00:05:09');
  assert.equal(vnTimestamp('17/10/2026', false), null);
});

test('fromLark các kiểu', () => {
  assert.equal(fromLark('text', [{ type: 'text', text: 'Đăng ' }, { type: 'text', text: 'mã' }]), 'Đăng mã');
  assert.equal(fromLark('single', { id: 'o1', text: 'Sáng' }), 'Sáng');
  assert.equal(fromLark('multi', [{ id: 'a', text: 'Fanpage Nô Tì' }, { id: 'b', text: 'Group Xóm Săn Sale' }]), 'Fanpage Nô Tì, Group Xóm Săn Sale');
  assert.equal(fromLark('num', 3), '3');
  assert.equal(fromLark('num', 0), '0');
  assert.equal(fromLark('check', true), '1');
  assert.equal(fromLark('check', false), '');
  assert.equal(fromLark('check', null), '');
  assert.equal(fromLark('url', [{ type: 'url', text: 'bài', link: 'https://fb.com/1' }]), 'https://fb.com/1');
  assert.equal(fromLark('text', null), '');
  assert.equal(fromLark('multi', []), '');
  assert.equal(fromLark('user', [{ id: 'u1' }]), '');
});

test('toLark các kiểu', () => {
  assert.deepEqual(toLark('text', ' Đăng mã ', ctx), [{ type: 'text', text: 'Đăng mã' }]);
  assert.equal(toLark('text', '', ctx), null);
  assert.equal(toLark('num', '1,5', ctx), 1.5);
  assert.equal(toLark('num', 'abc', ctx), null);
  assert.equal(toLark('num', '0', ctx), 0);
  assert.equal(toLark('check', '1', ctx), true);
  assert.equal(toLark('check', '', ctx), false);
  assert.equal(toLark('check', '0', ctx), false);
  assert.equal(toLark('check', 'false', ctx), false);
  assert.deepEqual(toLark('single', 'Sáng', ctx, 'Ca'), { id: 'opt_Ca_Sáng', text: 'Sáng' });
  assert.deepEqual(toLark('multi', 'A, , B', ctx, 'Kênh'), [{ id: 'opt_Kênh_A', text: 'A' }, { id: 'opt_Kênh_B', text: 'B' }]);
  assert.deepEqual(toLark('url', 'https://fb.com/1', ctx), [{ type: 'url', text: 'https://fb.com/1', link: 'https://fb.com/1' }]);
  assert.deepEqual(toLark('user', 'Giang, Hoa', ctx), [{ id: 'u_giang' }]);
  assert.equal(toLark('user', 'Hoa', ctx), null);
  assert.deepEqual(toLark('link:viec', 'v1', ctx), { text: '', type: 'text', recordIds: ['rec_v1'], tableId: 'tbl_viec' });
  assert.equal(toLark('link:viec', 'v9', ctx), null);
  assert.throws(() => toLark('rating', '5', ctx), /Kiểu cột không hỗ trợ: rating/);
});

test('splitList bỏ phần rỗng và khoảng trắng', () => {
  assert.deepEqual(splitList(' a , ,b,'), ['a', 'b']);
  assert.deepEqual(splitList(null), []);
});

test('đọc được mọi cột trong bản ghi mẫu thật', () => {
  const sample = JSON.parse(readFileSync(new URL('./fixtures/sdk-sample.json', import.meta.url), 'utf8'));
  for (const [type, { fields }] of Object.entries(TABLES)) {
    for (const record of sample[type]?.records ?? []) {
      for (const [key, fieldName, kind] of fields) {
        const value = fromLark(kind, record.fields[fieldName]);
        assert.equal(typeof value, 'string', `${type}.${key}`);
        if ((kind === 'date') && value) assert.match(value, /^\d{4}-\d{2}-\d{2}$/, `${type}.${key}`);
        if ((kind === 'datetime') && value) assert.match(value, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, `${type}.${key}`);
      }
    }
  }
});
