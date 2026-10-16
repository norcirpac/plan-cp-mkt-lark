import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolveMe } from '../js/identity.js';

const people = [{ ten: 'Giang', userId: 'u_giang' }, { ten: 'Hoa', userId: '' }];

test('chọn tay thắng tài khoản Lark', () => {
  assert.deepEqual(resolveMe({ manualMe: 'Hoa', userId: 'u_giang', people }), { me: 'Hoa', source: 'manual' });
});

test('chưa chọn tay thì nhận theo Lark', () => {
  assert.deepEqual(resolveMe({ manualMe: '', userId: 'u_giang', people }), { me: 'Giang', source: 'lark' });
});

test('không khớp ai thì phải hỏi', () => {
  assert.deepEqual(resolveMe({ manualMe: '', userId: 'u_la', people }), { me: '', source: 'none' });
  assert.deepEqual(resolveMe({ manualMe: '', userId: '', people }), { me: '', source: 'none' });
});
