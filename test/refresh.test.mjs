import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

import { createRefresher } from '../js/refresh.js';

function setup({ busy = false } = {}) {
  mock.timers.enable({ apis: ['setTimeout'] });
  const state = { clock: 0, busy, reloads: 0 };
  const refresher = createRefresher({
    reload: () => { state.reloads++; },
    isBusy: () => state.busy,
    now: () => state.clock,
    debounceMs: 1000,
    quietMs: 2000,
    retryMs: 3000,
  });
  return { refresher, state };
}

test('nhiều sự kiện liền nhau gộp thành một lần tải', (t) => {
  t.after(() => mock.timers.reset());
  const { refresher, state } = setup();
  refresher.notifyChange();
  mock.timers.tick(500);
  refresher.notifyChange();
  mock.timers.tick(999);
  assert.equal(state.reloads, 0);
  mock.timers.tick(1);
  assert.equal(state.reloads, 1);
});

test('bỏ qua sự kiện ngay sau khi chính mình ghi', (t) => {
  t.after(() => mock.timers.reset());
  const { refresher, state } = setup();
  state.clock = 10000;
  refresher.markOwnWrite();
  state.clock = 11500;
  refresher.notifyChange();
  mock.timers.tick(5000);
  assert.equal(state.reloads, 0);
  state.clock = 12500;
  refresher.notifyChange();
  mock.timers.tick(1000);
  assert.equal(state.reloads, 1);
});

test('đang sửa form thì hoãn, đóng form xong mới tải', (t) => {
  t.after(() => mock.timers.reset());
  const { refresher, state } = setup({ busy: true });
  refresher.requestNow();
  mock.timers.tick(0);
  mock.timers.tick(3000);
  assert.equal(state.reloads, 0);
  state.busy = false;
  mock.timers.tick(3000);
  assert.equal(state.reloads, 1);
});
