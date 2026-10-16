/**
 * Quyết định khi nào tải lại dữ liệu:
 * - gộp sự kiện Lark dồn dập thành một lần tải,
 * - bỏ qua sự kiện sinh ra từ chính lần ghi của mình,
 * - đang sửa form / kéo thả thì hoãn, thử lại sau.
 */
export function createRefresher({ reload, isBusy, now = () => Date.now(), debounceMs, quietMs, retryMs }) {
  let lastOwnWriteAt = Number.NEGATIVE_INFINITY;
  let timer = null;

  function schedule(delayMs) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fire, delayMs);
  }

  function fire() {
    timer = null;
    if (isBusy()) {
      schedule(retryMs);
      return;
    }
    reload();
  }

  return {
    markOwnWrite() {
      lastOwnWriteAt = now();
    },
    notifyChange() {
      if (now() - lastOwnWriteAt < quietMs) return;
      schedule(debounceMs);
    },
    requestNow() {
      schedule(0);
    },
  };
}
