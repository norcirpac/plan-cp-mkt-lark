import { SDK_URL, TABLES } from './config.js';
import { resolveMe } from './identity.js';
import { createLarkClient } from './lark/client.js';
import { createRefresher } from './refresh.js';
import { createStore } from './store.js';

const SDK_CONNECT_TIMEOUT_MS = 8000;
const AUTO_REFRESH_MS = 60 * 1000;
const EVENT_DEBOUNCE_MS = 1000;
const OWN_WRITE_QUIET_MS = 2000;
const BUSY_RETRY_MS = 3000;
const NOT_IN_LARK_MESSAGE = 'Hãy mở Plan CP·MKT trong Lark Base: thanh trên của Base → Extensions → Plan CP·MKT.';

// load, render, cfg, APP_ENV, canAutoRefresh, askWhoAmI là toàn cục của js/app/*.js (classic script)

function showFatal(message) {
  const app = document.getElementById('app');
  const box = document.createElement('div');
  box.className = 'empty';
  box.textContent = message;
  app.replaceChildren(box);
}

async function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}: quá ${ms} ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function connectSdk() {
  const { bitable } = await import(SDK_URL);
  // Ngoài Lark không có cầu nối nên lệnh đầu tiên không bao giờ trả lời → cần hạn chờ
  await withTimeout(bitable.base.getTableMetaList(), SDK_CONNECT_TIMEOUT_MS, 'Kết nối Lark Base');
  return bitable;
}

async function orDefault(label, promise, fallback) {
  try {
    return await promise;
  } catch (error) {
    console.error(label, error);
    return fallback;
  }
}

async function boot() {
  if (window.top === window) {
    showFatal(NOT_IN_LARK_MESSAGE);
    return;
  }
  let bitable;
  try {
    bitable = await connectSdk();
  } catch (error) {
    console.error('Không kết nối được Lark SDK', error);
    showFatal(NOT_IN_LARK_MESSAGE);
    return;
  }

  const client = createLarkClient(bitable);
  const store = createStore({ client });
  const refresher = createRefresher({
    reload: () => load(true),
    isBusy: () => !canAutoRefresh(),
    debounceMs: EVENT_DEBOUNCE_MS,
    quietMs: OWN_WRITE_QUIET_MS,
    retryMs: BUSY_RETRY_MS,
  });
  window.PlanStore = {
    range: (from, to) => store.range(from, to),
    async batch(ops) {
      refresher.markOwnWrite();
      try {
        return await store.batch(ops);
      } finally {
        refresher.markOwnWrite();
      }
    },
  };

  const [canEdit, userId] = await Promise.all([
    // Kiểm tra quyền lỗi thì vẫn cho sửa: Lark tự chặn khi ghi và app sẽ báo lỗi
    orDefault('Kiểm tra quyền sửa Base lỗi', client.canEdit(), true),
    orDefault('Lấy người dùng Lark lỗi', client.currentUserId(), ''),
  ]);
  APP_ENV.readOnly = !canEdit;
  await load();

  const { me, source } = resolveMe({ manualMe: cfg.me, userId, people: store.people() });
  if (source === 'lark') {
    cfg.me = me;
    render();
  }
  if (source === 'none') askWhoAmI();

  await orDefault('Đăng ký sự kiện Lark lỗi', client.onChange(Object.keys(TABLES), () => refresher.notifyChange()), null);
  setInterval(() => refresher.requestNow(), AUTO_REFRESH_MS);
}

boot();
