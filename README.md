# Plan CP·MKT — extension Lark Base

App lên kế hoạch ca Coupon + MKT, chạy trong Lark Base (Extensions → Plan CP·MKT).
Đọc và ghi thẳng Base bằng `@lark-base-open/js-sdk`; không cần Google Apps Script.

## Chạy thử trên máy
```bash
python3 tools/dev_server.py        # phục vụ http://127.0.0.1:5190
```
Trong Base **test**: Extensions → Custom → extension "Plan CP·MKT (dev)" trỏ `http://127.0.0.1:5190/index.html`.

## Test
```bash
node --test
```

## Cấu trúc
- `js/config.js`, `js/lark/*`, `js/store.js`, `js/identity.js`, `js/refresh.js`: lớp dữ liệu (ES module, có test).
- `js/app/*.js`: giao diện tách nguyên văn từ `legacy/Index.html` (classic script, dùng chung phạm vi toàn cục).
- `js/main.js`: khởi động.
- `legacy/`: bản Apps Script cũ, chỉ để tham chiếu.
