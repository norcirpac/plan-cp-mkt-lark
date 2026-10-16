# Plan CP·MKT trên Lark Base — kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Biến app Apps Script "Plan CP·MKT" thành extension Lark Base đọc và ghi thẳng Base bằng `@lark-base-open/js-sdk`, giữ nguyên giao diện 4 tab, host trên GitHub Pages.

**Architecture:**
- **Lớp dữ liệu mới** viết bằng ES module, test được bằng Node:
  - `config` chứa bảng ánh xạ cột.
  - `mapper` đổi giá trị Lark ↔ app.
  - `client` bọc SDK.
  - `store` cung cấp `range` / `batch` đúng hợp đồng của Code.gs.
- **Giao diện cũ** tách nguyên văn từ `Index.html` thành các classic script dùng chung phạm vi toàn cục. Chỉ thay lớp gọi dữ liệu, bỏ phần dính Google.
- **`js/main.js`** (module) kết nối SDK, gắn `window.PlanStore`, nhận người dùng, rồi khởi động app cũ.

**Tech Stack:** HTML/CSS/JS thuần, `@lark-base-open/js-sdk@1.0.2` từ jsDelivr, `node:test` (Node ≥ 22, máy đang có v25.2.1), Python 3 cho server dev tĩnh, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-16-lark-extension-design.md`

## Điều chỉnh so với spec (cần bạn duyệt cùng kế hoạch)
1. **Giao diện tách thành classic script `js/app/*.js`**, không chuyển sang ES module, cũng không tách riêng `js/domain/`.
   - Code cũ dùng hơn 200 hàm và biến toàn cục gọi chéo nhau. Thêm `import`/`export` cho từng chỗ là viết lại 1650 dòng và dễ vỡ.
   - Classic script vẫn chạy thẳng, không cần build.
   - Luật nghiệp vụ vẫn test được bằng Node: nạp các file vào `node:vm`.
2. **Bảng nhỏ đọc lại mỗi lần `range`**, không giữ bộ đệm riêng. Đọc 5 bảng nhỏ song song chỉ mất vài chục mili-giây, và bỏ được phần làm mới bộ đệm.
3. **Chế độ chỉ xem**: nhãn "👁 Chỉ xem" trên đầu trang, mọi thao tác lưu bị chặn kèm thông báo. Không ẩn từng nút; có hơn 60 loại nút, ẩn từng cái dễ sót.
4. **Thêm `js/refresh.js`**: gộp sự kiện, bỏ qua sự kiện do chính mình ghi, hoãn khi đang sửa. Tách riêng để test được.

## Global Constraints
- Không có bước build, không cài package npm, không tạo `package.json`. Test chạy bằng `node --test`.
- Phiên bản SDK cố định: `https://cdn.jsdelivr.net/npm/@lark-base-open/js-sdk@1.0.2/dist/index.mjs`.
- Mọi test chạy với `TZ=Asia/Ho_Chi_Minh` (helper tự đặt). Ngày giờ trong dữ liệu luôn theo giờ VN (+07:00).
- Ghi thử chỉ trên Base **"Plan CP·MKT – test"**, không ghi vào Base chính `<APP_TOKEN_BASE_CHINH>` cho tới Task 11.
- Phong cách code:
  - Nháy đơn, có dấu chấm phẩy, thụt 2 dấu cách, dấu phẩy cuối, `async/await` (không `.then`), return sớm, hằng số có tên.
  - Không `catch` rỗng: lỗi nào cũng `console.error` kèm ngữ cảnh rồi báo người dùng hoặc ném tiếp.
- Chữ hiển thị cho người dùng viết tiếng Việt có dấu.
- Agent không chạy `git commit` hay `git push`. Bước "Commit" là gợi ý lệnh để bạn tự chạy.
- Code ở `js/app/*.js` giữ nguyên văn từ `legacy/Index.html`, trừ các chỗ kế hoạch ghi rõ.

## Review Focus
- **Ngày quanh nửa đêm giờ VN** (bài đăng 00:30 sáng 17/10 phải ra `2026-10-17 00:30`, không phải 16/10). Test ở Task 3.
- **Bản ghi tạo tay trong Lark, không có cột `id`**: sửa trong app phải cập nhật đúng bản ghi đó, không sinh bản trùng. Test ở Task 5 và Task 6.
- **Ghi lỗi giữa chừng**: người dùng thấy lỗi đỏ nêu rõ bảng và thao tác, rồi app tải lại dữ liệu thật. Test ở Task 6 và Task 9.
- **Người chỉ có quyền xem** bấm lưu: không có gì đổi trên màn hình, có thông báo vì sao. Test ở Task 9.
- **Đang gõ trong form thì có người khác sửa Base**: không tải lại đè chữ đang gõ, tải sau khi đóng form. Test ở Task 7.

---

### Task 1: Khung dự án và bảng ánh xạ cột

**Files:**
- Create: `.gitignore`, `README.md`, `legacy/Index.html`, `legacy/Code.gs`, `js/config.js`
- Test: `test/config.test.mjs`

**Interfaces:**
- Produces:
  - `TABLES: Record<type, { name: string, fields: Array<[appKey, larkFieldName, kind]> }>`, gồm các type `chude, viec, bai, bangiao, thuvien, mau, macdinh, nhansu, danhmuc`.
  - `kind ∈ 'text' | 'single' | 'multi' | 'num' | 'check' | 'date' | 'datetime' | 'url' | 'user' | 'link:<type>'`.
  - `WRITABLE_TYPES: string[]`, theo đúng thứ tự ghi.
  - `idFieldOf(type): string | null`, `appKeysOf(type): string[]`.
  - Các hằng số: `SDK_URL`, `READ_PAGE_SIZE = 200`, `WRITE_CHUNK_SIZE = 100`, `FILTER_OR_LIMIT = 20`, `MAX_RANGE_DAYS = 31`, `FIELD_TYPE = { TEXT: 1, SINGLE_SELECT: 3, DATE_TIME: 5 }`.

- [ ] **Step 1: Tạo repo và lưu bản nguồn cũ để tham chiếu**

Bản nguồn cũ đang nằm trong scratchpad (sẽ mất khi hết phiên), nên chép vào `legacy/`:

```bash
cd ~/Work/plan-cp-mkt-lark
git init
mkdir -p legacy js/lark js/app css test/helpers test/fixtures tools
SCRATCH=/private/tmp/claude-501/-Users-piggi/8f01f4d7-0203-4f4b-b750-9626ec300012/scratchpad
cp "$SCRATCH/source/Index.html" legacy/Index.html
cp "$SCRATCH/gs/Code.gs" legacy/Code.gs
wc -l legacy/Index.html
```

Expected: `1969 legacy/Index.html` (hoặc 1970 nếu dòng cuối có xuống dòng). Dòng 1968 phải là `</script>`: `sed -n 1968p legacy/Index.html`.

- [ ] **Step 2: Viết `.gitignore` và `README.md`**

`.gitignore`:
```
.DS_Store
tmp/
```

`README.md`:
````markdown
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
````

- [ ] **Step 3: Viết test cho config**

`test/config.test.mjs`:
```js
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
```

- [ ] **Step 4: Chạy test, thấy lỗi**

Run: `node --test test/config.test.mjs`
Expected: FAIL với `Cannot find module .../js/config.js`.

- [ ] **Step 5: Viết `js/config.js`**

Danh sách cột chép nguyên từ `T` trong `legacy/Code.gs:21-31`, chỉ thay `tableId` bằng `name`:

```js
export const SDK_URL = 'https://cdn.jsdelivr.net/npm/@lark-base-open/js-sdk@1.0.2/dist/index.mjs';

export const READ_PAGE_SIZE = 200;
// SDK cho tối đa 200 bản ghi mỗi lần ghi; gửi 100 để còn dư địa
export const WRITE_CHUNK_SIZE = 100;
// Số điều kiện "hoặc" tối đa trong một lần lọc theo danh sách id
export const FILTER_OR_LIMIT = 20;
export const MAX_RANGE_DAYS = 31;
export const FIELD_TYPE = { TEXT: 1, SINGLE_SELECT: 3, DATE_TIME: 5 };

// type app → bảng Lark và [khoá app, tên cột Lark, kiểu]. Chép từ T trong legacy/Code.gs.
export const TABLES = {
  chude: { name: 'Chủ đề', fields: [['chuDe', 'Chủ đề', 'text'], ['id', 'id', 'text'], ['ngay', 'Ngày', 'date'], ['ca', 'Ca', 'single'], ['mang', 'Mảng', 'single'], ['nhom', 'Nhóm', 'single'], ['nguoi', 'Tên người (gốc)', 'text'], ['nguoi', 'Người', 'user'], ['kenhCan', 'Kênh cần', 'multi'], ['ghiChu', 'Ghi chú', 'text'], ['thuTu', 'Thứ tự', 'num'], ['capNhat', 'capNhat', 'text']] },
  viec: { name: 'Việc', fields: [['viec', 'Việc', 'text'], ['id', 'id', 'text'], ['ngay', 'Ngày', 'date'], ['ca', 'Ca', 'single'], ['chuDeId', 'chuDeId', 'text'], ['mang', 'Mảng', 'single'], ['nhom', 'Nhóm', 'single'], ['chuDeTen', 'Chủ đề', 'text'], ['nhomViec', 'nhomViec', 'text'], ['nguoi', 'Tên người (gốc)', 'text'], ['nguoi', 'Người', 'user'], ['caCa', 'Cả ca', 'check'], ['batDau', 'Giờ bắt đầu', 'text'], ['ketThuc', 'Giờ kết thúc', 'text'], ['kenh', 'Kênh', 'multi'], ['dangBai', 'Dạng bài', 'multi'], ['soLuong', 'Số bài dự kiến', 'num'], ['goiY', 'Gợi ý số bài', 'num'], ['gap', 'Việc gấp', 'check'], ['trangThai', 'Trạng thái', 'single'], ['lyDo', 'Lý do trì hoãn', 'single'], ['doiNgay', 'Dời sang ngày', 'date'], ['doiCa', 'Dời sang ca', 'single'], ['goc', 'goc', 'text'], ['lichSu', 'Lịch sử', 'text'], ['ghiChu', 'Ghi chú', 'text'], ['thuTu', 'Thứ tự', 'num'], ['capNhat', 'capNhat', 'text']] },
  bai: { name: 'Bài đăng', fields: [['idea', 'Idea', 'text'], ['id', 'id', 'text'], ['viecId', 'viecId', 'text'], ['viecId', 'Việc', 'link:viec'], ['stt', 'stt', 'num'], ['ngay', 'Ngày', 'date'], ['ca', 'Ca', 'single'], ['mang', 'Mảng', 'single'], ['chuDeTen', 'Chủ đề', 'text'], ['nguoi', 'Tên người (gốc)', 'text'], ['nguoi', 'Người đăng', 'user'], ['kenh', 'Kênh', 'single'], ['dangBai', 'Dạng bài', 'single'], ['link', 'Link', 'url'], ['khongLink', 'Không có link', 'check'], ['tgDang', 'Thời điểm đăng', 'datetime'], ['tiepCan', 'Tiếp cận', 'num'], ['thich', 'Thích', 'num'], ['binhLuan', 'Bình luận', 'num'], ['tgDien', 'Thời điểm điền số liệu', 'datetime'], ['capNhat', 'capNhat', 'text']] },
  bangiao: { name: 'Bàn giao', fields: [['ghiChu', 'Ghi chú', 'text'], ['id', 'id', 'text'], ['ngay', 'Ngày', 'date'], ['ca', 'Ca', 'single'], ['mang', 'Mảng', 'single'], ['capNhat', 'capNhat', 'text']] },
  thuvien: { name: 'Thư viện', fields: [['ten', 'Tên', 'text'], ['id', 'id', 'text'], ['loai', 'Loại', 'single'], ['mang', 'Mảng', 'single'], ['nhom', 'Nhóm', 'single'], ['chuDeTen', 'Chủ đề', 'text'], ['kenh', 'Kênh', 'multi'], ['dangBai', 'Dạng bài', 'multi'], ['caCa', 'Cả ca', 'check'], ['batDau', 'Giờ bắt đầu', 'text'], ['ketThuc', 'Giờ kết thúc', 'text'], ['soLuong', 'Số lượng', 'num'], ['capNhat', 'capNhat', 'text']] },
  mau: { name: 'Mẫu', fields: [['chuDe', 'Chủ đề', 'text'], ['id', 'id', 'text'], ['khoi', 'Khối', 'single'], ['mang', 'Mảng', 'single'], ['nhom', 'Nhóm', 'single'], ['thuTu', 'Thứ tự', 'num'], ['kenhCan', 'Kênh cần', 'multi'], ['ghiChu', 'Ghi chú', 'text'], ['viecJson', 'Danh sách việc (JSON)', 'text'], ['capNhat', 'capNhat', 'text']] },
  macdinh: { name: 'Phân công mặc định', fields: [['id', 'Ca | Mảng', 'text'], ['ca', 'Ca', 'single'], ['mang', 'Mảng', 'multi'], ['nguoi', 'Tên người (gốc)', 'text'], ['nguoi', 'Người', 'user'], ['capNhat', 'capNhat', 'text']] },
  nhansu: { name: 'Nhân sự', fields: [['ten', 'Tên', 'text'], ['openId', 'Người', 'user']] },
  danhmuc: { name: 'Danh mục', fields: [['kenh', 'Kênh', 'text'], ['dangBai', 'Dạng bài', 'text'], ['lyDo', 'Lý do', 'text']] },
};

export const WRITABLE_TYPES = ['chude', 'viec', 'bai', 'bangiao', 'thuvien', 'mau', 'macdinh'];

export function idFieldOf(type) {
  const idField = TABLES[type].fields.find(([key]) => key === 'id');
  return idField ? idField[1] : null;
}

export const appKeysOf = (type) => [...new Set(TABLES[type].fields.map(([key]) => key))];
```

- [ ] **Step 6: Chạy test, thấy qua**

Run: `node --test test/config.test.mjs`
Expected: PASS, 5 test.

- [ ] **Step 7: Commit** (bạn tự chạy)

```bash
git add .gitignore README.md legacy js/config.js test/config.test.mjs
git commit -m "chore: scaffold Lark extension repo with table mapping"
```

---

### Task 2: Base test, server dev và trang thăm dò SDK

Task này trả lời các câu hỏi mà định nghĩa SDK chưa nói rõ, để Task 3–6 viết đúng ngay từ đầu:
- Dạng giá trị gốc từng kiểu cột.
- Ghi chữ trơn có được không, ghi `null` có xoá ô không.
- Dạng ghi liên kết và người dùng.
- Lọc theo ngày có ra đúng số bản ghi không.
- Id người dùng của `getUserId()` có khớp cột Người không.

**Files:**
- Create: `tools/dev_server.py`, `tools/probe.html`, `docs/sdk-notes.md`, `test/fixtures/sdk-sample.json`

**Interfaces:**
- Consumes: `SDK_URL`, `TABLES` (Task 1).
- Produces:
  - `docs/sdk-notes.md` ghi kết quả và quyết định cho Task 3–6.
  - `test/fixtures/sdk-sample.json` dạng `{ [type]: { fields: [...], records: [{ recordId, fields: { [tênCột]: giáTrịGốc } }] } }`.

- [ ] **Step 1: Tạo Base test**

Mở https://<tenant>.larksuite.com/base/<APP_TOKEN_BASE_CHINH> bằng Chrome (claude-in-chrome).
1. Bấm "…" cạnh tên Base → **Make a copy / Tạo bản sao**, đặt tên `Plan CP·MKT – test`, chọn **sao chép cả dữ liệu**.
2. Mở bản sao, kiểm tra đủ 9 bảng: Chủ đề, Việc, Bài đăng, Bàn giao, Thư viện, Mẫu, Phân công mặc định, Nhân sự, Danh mục.
3. Vào Automations của bản sao, xác nhận cả hai automation nhắc quá giờ đang **tắt**.
4. Ghi URL Base test vào `docs/sdk-notes.md` (Step 6).

- [ ] **Step 2: Viết server dev**

`tools/dev_server.py`:
```python
"""Server tĩnh lúc dev extension + nhận báo cáo thăm dò SDK. Chỉ nghe 127.0.0.1.

Cách dùng (từ gốc repo): python3 tools/dev_server.py [port]
POST /__report  → lưu body vào tmp/probe-report.json
"""
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPORT_PATH = os.path.join(ROOT, 'tmp', 'probe-report.json')
DEFAULT_PORT = 5190


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Lark giữ iframe extension lâu; tắt cache để mỗi lần Refresh là thấy code mới
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        if self.path != '/__report':
            self.send_error(404)
            return
        body = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)
        with open(REPORT_PATH, 'wb') as report_file:
            report_file.write(body)
        self.send_response(204)
        self.end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PORT
print(f'Serving {ROOT} at http://127.0.0.1:{port}')
ThreadingHTTPServer(('127.0.0.1', port), partial(Handler, directory=ROOT)).serve_forever()
```

Chạy nền (Bash `run_in_background`): `python3 ~/Work/plan-cp-mkt-lark/tools/dev_server.py`.
Kiểm tra: `curl -sI http://127.0.0.1:5190/README.md | head -1` → `HTTP/1.0 200 OK`.

- [ ] **Step 3: Viết trang thăm dò**

`tools/probe.html`: chỉ chạy trên Base test. Trang có ghi thử rồi tự xoá bản ghi `probe*`.
```html
<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<title>Thăm dò SDK</title>
<style>body { font: 13px/1.4 system-ui, sans-serif; margin: 12px; } pre { white-space: pre-wrap; }</style>
</head>
<body>
<b>Thăm dò SDK Lark — chỉ chạy trên Base test</b>
<pre id="out">Đang chạy…</pre>
<script type="module">
import { FIELD_TYPE, SDK_URL, TABLES } from '../js/config.js';

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const out = document.getElementById('out');
const report = { startedAt: new Date().toISOString(), steps: [] };

async function step(name, fn) {
  try {
    report.steps.push({ name, ok: true, result: await fn() });
  } catch (error) {
    console.error('Probe step failed', name, error);
    report.steps.push({ name, ok: false, error: String(error?.message || error) });
  }
}

const { bitable } = await import(SDK_URL);
const tableOf = (type) => bitable.base.getTableByName(TABLES[type].name);
const metaByName = async (table) => Object.fromEntries((await table.getFieldMetaList()).map((meta) => [meta.name, meta]));
const textCell = (text) => [{ type: 'text', text }];
const idFilter = (fieldId, value) => ({
  conjunction: 'and',
  conditions: [{ fieldId, operator: 'is', value, fieldType: FIELD_TYPE.TEXT }],
});

async function readAll(table) {
  const records = [];
  let pageToken;
  do {
    const page = await table.getRecordsByPage({ pageSize: 200, ...(pageToken ? { pageToken } : {}) });
    records.push(...page.records);
    pageToken = page.hasMore ? page.pageToken : undefined;
  } while (pageToken);
  return records;
}

await step('tables', async () => (await bitable.base.getTableMetaList()).map((table) => table.name));

await step('samples', async () => {
  const result = {};
  for (const type of Object.keys(TABLES)) {
    const table = await tableOf(type);
    const metas = await table.getFieldMetaList();
    const nameById = Object.fromEntries(metas.map((meta) => [meta.id, meta.name]));
    const page = await table.getRecordsByPage({ pageSize: 3 });
    result[type] = {
      fields: metas.map((meta) => ({ name: meta.name, fieldType: meta.type, optionCount: meta.property?.options?.length ?? null })),
      records: page.records.map((record) => ({
        recordId: record.recordId,
        fields: Object.fromEntries(Object.entries(record.fields).map(([fieldId, value]) => [nameById[fieldId], value])),
      })),
    };
  }
  return result;
});

await step('identity', async () => {
  const userId = await bitable.bridge.getUserId();
  const baseUserId = await bitable.bridge.getBaseUserId();
  const table = await tableOf('nhansu');
  const meta = await metaByName(table);
  const people = (await readAll(table)).map((record) => ({
    ten: record.fields[meta['Tên'].id],
    users: record.fields[meta['Người'].id] ?? [],
  }));
  return {
    userId,
    baseUserId,
    matchedByUserId: people.filter((p) => p.users.some((u) => u.id === userId)).length,
    matchedByBaseUserId: people.filter((p) => p.users.some((u) => u.id === baseUserId)).length,
    firstPeople: people.slice(0, 2),
  };
});

await step('canEdit', () => bitable.base.getPermission({ entity: 'Base', type: 'editable' }));

await step('dateFilter', async () => {
  const table = await tableOf('viec');
  const meta = await metaByName(table);
  const all = await readAll(table);
  const dayMs = all.find((record) => record.fields[meta['Ngày'].id])?.fields[meta['Ngày'].id];
  const expected = all.filter((record) => record.fields[meta['Ngày'].id] === dayMs).length;
  const filtered = await table.getRecordsByPage({
    pageSize: 200,
    filter: { conjunction: 'or', conditions: [{ fieldId: meta['Ngày'].id, operator: 'is', value: dayMs, fieldType: FIELD_TYPE.DATE_TIME }] },
  });
  return { dayMs, dayVn: new Date(dayMs + VN_OFFSET_MS).toISOString(), expected, got: filtered.records.length };
});

await step('writeBanGiao', async () => {
  const table = await tableOf('bangiao');
  const meta = await metaByName(table);
  const caOption = meta['Ca'].property.options[0];
  const readBack = async () => (await table.getRecordsByPage({ pageSize: 5, filter: idFilter(meta['id'].id, 'probe1') }))
    .records.map((record) => record.fields);
  const [recordId] = await table.addRecords([{ fields: {
    [meta['id'].id]: textCell('probe1'),
    [meta['Ghi chú'].id]: textCell('PROBE – xoá được'),
    [meta['Ngày'].id]: Date.UTC(2026, 0, 1) - VN_OFFSET_MS,
    [meta['Ca'].id]: { id: caOption.id, text: caOption.name },
  } }]);
  const afterAdd = await readBack();
  await table.setRecords([{ recordId, fields: { [meta['Ghi chú'].id]: null, [meta['Ca'].id]: null } }]);
  const afterNull = await readBack();
  let plainString;
  try {
    await table.setRecords([{ recordId, fields: { [meta['Ghi chú'].id]: 'chuỗi trơn' } }]);
    plainString = await readBack();
  } catch (error) {
    plainString = `lỗi: ${error.message}`;
  }
  await table.deleteRecords([recordId]);
  return { afterAdd, afterNull, plainString, afterDelete: await readBack() };
});

await step('addOption', async () => {
  const table = await tableOf('bangiao');
  const meta = await metaByName(table);
  const field = await table.getFieldById(meta['Mảng'].id);
  await field.addOption('PROBE-xoá');
  const after = await metaByName(table);
  return { added: after['Mảng'].property.options.find((option) => option.name === 'PROBE-xoá') ?? null };
});

await step('writeBaiLinkUrlUser', async () => {
  const bai = await tableOf('bai');
  const viec = await tableOf('viec');
  const meta = await metaByName(bai);
  const firstViec = (await viec.getRecordsByPage({ pageSize: 1 })).records[0];
  const userId = await bitable.bridge.getUserId();
  const attempts = {
    object: { text: '', type: 'text', recordIds: [firstViec.recordId], tableId: viec.id },
    idList: [firstViec.recordId],
  };
  const result = {};
  for (const [label, linkValue] of Object.entries(attempts)) {
    try {
      const [recordId] = await bai.addRecords([{ fields: {
        [meta['id'].id]: textCell(`probe-${label}`),
        [meta['Việc'].id]: linkValue,
        [meta['Link'].id]: [{ type: 'url', text: 'https://example.com', link: 'https://example.com' }],
        [meta['Người đăng'].id]: [{ id: userId }],
      } }]);
      const back = (await bai.getRecordsByPage({ pageSize: 5, filter: idFilter(meta['id'].id, `probe-${label}`) })).records[0];
      result[label] = { link: back?.fields[meta['Việc'].id], url: back?.fields[meta['Link'].id], user: back?.fields[meta['Người đăng'].id] };
      await bai.deleteRecords([recordId]);
    } catch (error) {
      console.error('Probe link attempt failed', label, error);
      result[label] = `lỗi: ${error.message}`;
    }
  }
  return result;
});

report.finishedAt = new Date().toISOString();
out.textContent = JSON.stringify(report, null, 2);
await fetch('/__report', { method: 'POST', body: JSON.stringify(report) });
</script>
</body>
</html>
```

- [ ] **Step 4: Chạy trang thăm dò trong Base test**

1. Trong Base test: thanh trên → icon Extensions → **Custom** → **+ New Extension**.
2. Name `Probe`, Service URL `http://127.0.0.1:5190/tools/probe.html`.
3. Mở extension, chờ chữ "Đang chạy…" đổi thành JSON.
4. Kiểm tra: `python3 -m json.tool ~/Work/plan-cp-mkt-lark/tmp/probe-report.json | head -40`
   Expected: có đủ 8 step, mỗi step có `ok`.

- [ ] **Step 5: Lưu bản ghi mẫu làm fixture**

```bash
cd ~/Work/plan-cp-mkt-lark
python3 -c "import json;r=json.load(open('tmp/probe-report.json'));s=[x for x in r['steps'] if x['name']=='samples'][0];json.dump(s['result'],open('test/fixtures/sdk-sample.json','w'),ensure_ascii=False,indent=1)"
```
Mở file kiểm tra nhanh: không có dữ liệu nhạy cảm ngoài tên, việc và id người dùng nội bộ (repo public). Nếu có email trong cột Người thì xoá trường `email` khỏi fixture trước khi commit.

- [ ] **Step 6: Ghi kết quả và quyết định vào `docs/sdk-notes.md`**

Viết theo mẫu dưới. Mỗi dòng "Quyết định" chọn đúng một nhánh dựa trên báo cáo:
```markdown
# Ghi chú SDK (thăm dò 2026-10-16 trên Base test <URL>)

| Câu hỏi | Kết quả | Quyết định cho code |
|---|---|---|
| Text đọc ra dạng gì | ... | mapper đọc mảng segment, nối `text` |
| Ghi text bằng segment | ok/lỗi | dùng `[{ type: 'text', text }]` |
| Ghi `null` có xoá ô | ... | nếu xoá được: bản sửa gửi `null` như Code.gs; nếu lỗi: bỏ cột `null` khỏi bản sửa |
| Lọc ngày `is` + mốc 00:00 VN | expected=…, got=… | khớp: dùng `is`; lệch: dùng khoảng `isGreater`/`isLess` (xem Task 5 Step 6) |
| Ghi liên kết | object/idList | dạng nào đọc lại có `recordIds` thì dùng dạng đó trong `toLark('link:…')` |
| Ghi URL, người dùng | ... | ... |
| `addOption` | ... | ... |
| `getUserId` khớp cột Người | matchedByUserId=…, matchedByBaseUserId=… | dùng id nào khớp; không cái nào khớp thì chỉ dựa vào "Bạn là ai?" |
```
Sau đó xoá lựa chọn `PROBE-xoá` khỏi cột Mảng của bảng Bàn giao trong Base test (sửa cột → xoá lựa chọn). Xoá extension `Probe`.

- [ ] **Step 7: Nếu kết quả khác với giả định của kế hoạch, sửa các task sau trước khi làm tiếp**

Giả định hiện tại:
- Text, URL, người dùng ghi theo dạng ở trên.
- Liên kết ghi dạng `object`.
- `null` xoá ô.
- Lọc `is` khớp.

Khác ở đâu thì sửa code mẫu của task tương ứng (Task 3 mapper, Task 5 lọc) và báo lại cho người dùng trước khi làm tiếp.

- [ ] **Step 8: Commit** (bạn tự chạy)

```bash
git add tools/dev_server.py tools/probe.html docs/sdk-notes.md test/fixtures/sdk-sample.json
git commit -m "chore: add dev server and SDK probe with recorded findings"
```

---

### Task 3: Đổi kiểu giá trị (`mapper.js`)

**Files:**
- Create: `js/lark/mapper.js`
- Test: `test/mapper.test.mjs`

**Interfaces:**
- Consumes: `TABLES` (Task 1), `test/fixtures/sdk-sample.json` (Task 2).
- Produces:
  - `vnTimestamp(text: string, withTime: boolean): number | null`. Nhận `YYYY-MM-DD`, `YYYY-MM-DD HH:mm` hoặc `YYYY-MM-DDTHH:mm`.
  - `vnDateString(ms: number, withTime: boolean): string`.
  - `vnNowStamp(nowMs: number): string`, dạng `YYYY-MM-DDTHH:mm:ss` giờ VN.
  - `splitList(text): string[]`.
  - `fromLark(kind, raw): string`.
  - `toLark(kind, value, ctx, fieldName)`.
  - `ctx = { option(fieldName, text) → {id,text}|null, userId(name) → string|null, recordId(type, appId) → string|null, tableId(type) → string|null }`.

- [ ] **Step 1: Viết test**

`test/mapper.test.mjs`:
```js
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
```

- [ ] **Step 2: Chạy test, thấy lỗi**

Run: `node --test test/mapper.test.mjs`
Expected: FAIL, `Cannot find module .../js/lark/mapper.js`.

- [ ] **Step 3: Viết `js/lark/mapper.js`**

```js
// Việt Nam không đổi giờ mùa hè nên cộng +7 giờ cố định, không phụ thuộc múi giờ máy người dùng
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const VN_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/;
const FALSE_CHECK_VALUES = ['', '0', 'false', 'FALSE'];

const pad2 = (n) => String(n).padStart(2, '0');

export function vnTimestamp(text, withTime) {
  const match = VN_DATE_PATTERN.exec(String(text ?? '').trim());
  if (!match) return null;
  const [, year, month, day, hours, minutes] = match;
  const useTime = withTime && hours !== undefined;
  return Date.UTC(+year, +month - 1, +day, useTime ? +hours : 0, useTime ? +minutes : 0) - VN_OFFSET_MS;
}

export function vnDateString(ms, withTime) {
  const vn = new Date(ms + VN_OFFSET_MS);
  const day = `${vn.getUTCFullYear()}-${pad2(vn.getUTCMonth() + 1)}-${pad2(vn.getUTCDate())}`;
  if (!withTime) return day;
  return `${day} ${pad2(vn.getUTCHours())}:${pad2(vn.getUTCMinutes())}`;
}

export function vnNowStamp(nowMs) {
  const vn = new Date(nowMs + VN_OFFSET_MS);
  return `${vnDateString(nowMs, false)}T${pad2(vn.getUTCHours())}:${pad2(vn.getUTCMinutes())}:${pad2(vn.getUTCSeconds())}`;
}

export const splitList = (text) => String(text ?? '').split(',').map((part) => part.trim()).filter(Boolean);

const isEmptyCell = (raw) => raw === null || raw === undefined || raw === '' || (Array.isArray(raw) && raw.length === 0);

function segmentsText(raw) {
  if (!Array.isArray(raw)) return String(raw);
  return raw.map((segment) => (segment && typeof segment === 'object' ? segment.text ?? '' : String(segment))).join('');
}

function urlOf(raw) {
  if (!Array.isArray(raw)) return typeof raw === 'object' ? raw.link ?? '' : String(raw);
  const withLink = raw.find((segment) => segment?.link);
  return withLink ? withLink.link : segmentsText(raw);
}

/** Giá trị gốc của Lark → chuỗi app dùng. Cột người dùng và liên kết không đọc (app dùng cột chữ đi kèm). */
export function fromLark(kind, raw) {
  if (kind === 'check') return raw ? '1' : '';
  if (isEmptyCell(raw)) return '';
  switch (kind) {
    case 'text': return segmentsText(raw);
    case 'single': return typeof raw === 'object' && !Array.isArray(raw) ? raw.text ?? '' : segmentsText(raw);
    case 'multi': return raw.map((option) => option.text).join(', ');
    case 'num': return String(Number(raw));
    case 'date': return vnDateString(raw, false);
    case 'datetime': return vnDateString(raw, true);
    case 'url': return urlOf(raw);
    default: return '';
  }
}

/** Chuỗi của app → giá trị ghi vào Lark. `null` nghĩa là để trống ô. */
export function toLark(kind, value, ctx, fieldName) {
  if (kind === 'check') return !FALSE_CHECK_VALUES.includes(String(value ?? ''));
  const text = String(value ?? '').trim();
  if (text === '') return null;
  switch (kind) {
    case 'text': return [{ type: 'text', text }];
    case 'single': return ctx.option(fieldName, text);
    case 'multi': {
      const options = splitList(text).map((part) => ctx.option(fieldName, part)).filter(Boolean);
      return options.length ? options : null;
    }
    case 'num': {
      const number = Number(text.replace(',', '.'));
      return Number.isNaN(number) ? null : number;
    }
    case 'date': return vnTimestamp(text, false);
    case 'datetime': return vnTimestamp(text, true);
    case 'url': return [{ type: 'url', text, link: text }];
    case 'user': {
      const ids = splitList(text).map((name) => ctx.userId(name)).filter(Boolean);
      return ids.length ? ids.map((id) => ({ id })) : null;
    }
    default: break;
  }
  if (kind.startsWith('link:')) {
    const target = kind.slice('link:'.length);
    const recordId = ctx.recordId(target, text);
    return recordId ? { text: '', type: 'text', recordIds: [recordId], tableId: ctx.tableId(target) } : null;
  }
  throw new Error(`Kiểu cột không hỗ trợ: ${kind}`);
}
```

- [ ] **Step 4: Chạy test, thấy qua**

Run: `node --test test/mapper.test.mjs`
Expected: PASS, 5 test.

- [ ] **Step 5: Commit** (bạn tự chạy)

```bash
git add js/lark/mapper.js test/mapper.test.mjs
git commit -m "feat: add Lark value mapper with VN timezone handling"
```

---

### Task 4: SDK giả và lớp bọc SDK (`client.js`)

**Files:**
- Create: `test/helpers/fake-bitable.mjs`, `js/lark/client.js`
- Test: `test/client.test.mjs`

**Interfaces:**
- Consumes: `TABLES`, `READ_PAGE_SIZE`, `WRITE_CHUNK_SIZE` (Task 1).
- Produces:
  - `createLarkClient(bitable)` trả về:
    - `tableId(type): Promise<string>`
    - `fieldId(type, fieldName): Promise<string>`
    - `findOption(type, fieldName, text): Promise<{id,text}|null>`
    - `addOption(type, fieldName, text): Promise<{id,text}>`
    - `readRecords(type, filter?): Promise<Array<{ recordId, fields: { [tênCột]: raw } }>>`
    - `addRecords(type, list: Array<{ [tênCột]: raw }>): Promise<string[]>` (record_id theo đúng thứ tự)
    - `setRecords(type, list: Array<{ recordId, fields: { [tênCột]: raw } }>): Promise<void>`
    - `deleteRecords(type, recordIds: string[]): Promise<void>`
    - `canEdit(): Promise<boolean>`
    - `currentUserId(): Promise<string>`
    - `onChange(types: string[], callback): Promise<() => void>`
  - Test helper `createFakeBitable({ userId?, canEdit? }) → { bitable, tables }`. `tables[type]` có:
    - `seed(valuesByName, recordId?)`, `option(fieldName, text)`
    - `valuesOf(recordId)` (giá trị theo tên cột), `records`
    - `calls` (mảng `{ method, size?, filter? }`), `failNext` (tên hàm sẽ lỗi một lần), `emit(kind, data)`

- [ ] **Step 1: Viết SDK giả**

`test/helpers/fake-bitable.mjs`:
```js
import { TABLES } from '../../js/config.js';

// Mã kiểu cột của Lark: Text 1, Number 2, SingleSelect 3, MultiSelect 4, DateTime 5, Checkbox 7, User 11, Url 15, DuplexLink 21
const FIELD_TYPE_OF_KIND = { text: 1, num: 2, single: 3, multi: 4, date: 5, datetime: 5, check: 7, user: 11, url: 15 };
const LINK_FIELD_TYPE = 21;
export const SDK_WRITE_LIMIT = 200;

export const text = (value) => [{ type: 'text', text: value }];

function schemaOf(type) {
  const seenNames = new Set();
  const fields = [];
  TABLES[type].fields.forEach(([, name, kind]) => {
    if (seenNames.has(name)) return;
    seenNames.add(name);
    fields.push({
      id: `${type}_f${fields.length}`,
      name,
      type: kind.startsWith('link:') ? LINK_FIELD_TYPE : FIELD_TYPE_OF_KIND[kind],
      property: kind === 'single' || kind === 'multi' ? { options: [] } : null,
    });
  });
  return fields;
}

const cellText = (raw) => (Array.isArray(raw) ? raw.map((segment) => segment?.text ?? '').join('') : String(raw ?? ''));

class FakeTable {
  constructor(type) {
    this.type = type;
    this.name = TABLES[type].name;
    this.id = `tbl_${type}`;
    this.fields = schemaOf(type);
    this.records = [];
    this.calls = [];
    this.failNext = null;
    this.nextRecordNumber = 1;
    this.listeners = { add: [], modify: [], delete: [] };
  }

  fieldByName(name) {
    const field = this.fields.find((candidate) => candidate.name === name);
    if (!field) throw new Error(`fake: bảng ${this.name} không có cột ${name}`);
    return field;
  }

  option(fieldName, name) {
    const field = this.fieldByName(fieldName);
    let found = field.property.options.find((candidate) => candidate.name === name);
    if (!found) {
      found = { id: `opt_${field.id}_${field.property.options.length}`, name };
      field.property.options.push(found);
    }
    return { id: found.id, text: found.name };
  }

  seed(valuesByName, recordId = `rec_${this.type}_${this.nextRecordNumber++}`) {
    const fields = {};
    for (const [name, value] of Object.entries(valuesByName)) fields[this.fieldByName(name).id] = value;
    this.records.push({ recordId, fields });
    return recordId;
  }

  valuesOf(recordId) {
    const record = this.records.find((candidate) => candidate.recordId === recordId);
    if (!record) return null;
    return Object.fromEntries(this.fields.map((field) => [field.name, record.fields[field.id] ?? null]));
  }

  guard(method, size) {
    this.calls.push({ method, size });
    if (size > SDK_WRITE_LIMIT) throw new Error('SingleRecordOperationLimitExceeded');
    if (this.failNext !== method) return;
    this.failNext = null;
    throw new Error(`fake ${method} lỗi`);
  }

  matches(record, filter) {
    const results = filter.conditions.map((condition) => {
      if ('conjunction' in condition) return this.matches(record, condition);
      if (condition.operator !== 'is') throw new Error(`fake: chưa hỗ trợ toán tử ${condition.operator}`);
      const field = this.fields.find((candidate) => candidate.id === condition.fieldId);
      const raw = record.fields[condition.fieldId];
      if (field.type === FIELD_TYPE_OF_KIND.date) return raw === condition.value;
      if (field.type === FIELD_TYPE_OF_KIND.single) return raw?.id === condition.value;
      return cellText(raw) === condition.value;
    });
    return filter.conjunction === 'or' ? results.some(Boolean) : results.every(Boolean);
  }

  async getFieldMetaList() {
    return structuredClone(this.fields);
  }

  async getFieldById(fieldId) {
    const field = this.fields.find((candidate) => candidate.id === fieldId);
    return {
      addOption: async (name) => {
        this.calls.push({ method: 'addOption', name });
        field.property.options.push({ id: `opt_${field.id}_${field.property.options.length}`, name });
        return true;
      },
    };
  }

  async getRecordsByPage({ pageSize = 200, pageToken, filter } = {}) {
    this.calls.push({ method: 'getRecordsByPage', filter });
    const matched = this.records.filter((record) => !filter || this.matches(record, filter));
    const start = pageToken ? Number(pageToken) : 0;
    const hasMore = start + pageSize < matched.length;
    return {
      records: structuredClone(matched.slice(start, start + pageSize)),
      hasMore,
      pageToken: hasMore ? String(start + pageSize) : undefined,
      total: matched.length,
    };
  }

  async addRecords(list) {
    this.guard('addRecords', list.length);
    return list.map(({ fields }) => {
      const recordId = `rec_${this.type}_${this.nextRecordNumber++}`;
      this.records.push({ recordId, fields: structuredClone(fields) });
      return recordId;
    });
  }

  async setRecords(list) {
    this.guard('setRecords', list.length);
    for (const { recordId, fields } of list) {
      const record = this.records.find((candidate) => candidate.recordId === recordId);
      if (!record) throw new Error(`fake: không có bản ghi ${recordId}`);
      Object.assign(record.fields, structuredClone(fields));
    }
    return list.map(({ recordId }) => recordId);
  }

  async deleteRecords(recordIds) {
    this.guard('deleteRecords', recordIds.length);
    this.records = this.records.filter((record) => !recordIds.includes(record.recordId));
    return true;
  }

  listen(kind, callback) {
    this.listeners[kind].push(callback);
    return () => { this.listeners[kind] = this.listeners[kind].filter((candidate) => candidate !== callback); };
  }

  onRecordAdd(callback) { return this.listen('add', callback); }

  onRecordModify(callback) { return this.listen('modify', callback); }

  onRecordDelete(callback) { return this.listen('delete', callback); }

  emit(kind, data) {
    this.listeners[kind].forEach((callback) => callback({ data }));
  }
}

export function createFakeBitable({ userId = 'u_me', canEdit = true } = {}) {
  const tables = Object.fromEntries(Object.keys(TABLES).map((type) => [type, new FakeTable(type)]));
  const tableByName = new Map(Object.values(tables).map((table) => [table.name, table]));
  const bitable = {
    base: {
      async getTableByName(name) {
        const table = tableByName.get(name);
        if (!table) throw new Error(`fake: không có bảng ${name}`);
        return table;
      },
      getPermission: async () => canEdit,
    },
    bridge: { getUserId: async () => userId },
  };
  return { bitable, tables };
}
```

- [ ] **Step 2: Viết test cho client**

`test/client.test.mjs`:
```js
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
  const { bitable, tables } = createFakeBitable({ userId: 'u_giang', canEdit: false });
  const client = createLarkClient(bitable);
  assert.equal(await client.canEdit(), false);
  assert.equal(await client.currentUserId(), 'u_giang');
  let count = 0;
  const off = await client.onChange(['viec', 'bai'], () => { count++; });
  tables.viec.emit('modify', { recordId: 'r1', fieldIds: [] });
  tables.bai.emit('add', 'r2');
  off();
  tables.viec.emit('delete', 'r1');
  assert.equal(count, 2);
});
```

`opt_viec_f3_0`: cột `Ca` là cột thứ 4 (chỉ số 3) trong danh sách cột không trùng tên của `viec`: Việc, id, Ngày, Ca.

- [ ] **Step 3: Chạy test, thấy lỗi**

Run: `node --test test/client.test.mjs`
Expected: FAIL, `Cannot find module .../js/lark/client.js`.

- [ ] **Step 4: Viết `js/lark/client.js`**

```js
import { READ_PAGE_SIZE, TABLES, WRITE_CHUNK_SIZE } from '../config.js';

function chunk(list, size) {
  const parts = [];
  for (let i = 0; i < list.length; i += size) parts.push(list.slice(i, i + size));
  return parts;
}

/**
 * Lớp mỏng bọc SDK Lark Base: làm việc theo tên bảng/tên cột của config,
 * đổi qua lại field id ở đây để các lớp trên không phải biết.
 */
export function createLarkClient(bitable) {
  const openedTables = new Map();

  async function loadMeta(entry) {
    const metas = await entry.table.getFieldMetaList();
    entry.metaByName = new Map(metas.map((meta) => [meta.name, meta]));
    entry.nameById = new Map(metas.map((meta) => [meta.id, meta.name]));
  }

  async function open(type) {
    if (openedTables.has(type)) return openedTables.get(type);
    const name = TABLES[type].name;
    const table = await bitable.base.getTableByName(name);
    const entry = { name, table };
    await loadMeta(entry);
    openedTables.set(type, entry);
    return entry;
  }

  function metaOf(entry, fieldName) {
    const meta = entry.metaByName.get(fieldName);
    if (!meta) throw new Error(`Bảng "${entry.name}" không có cột "${fieldName}"`);
    return meta;
  }

  const toFieldIds = (entry, fieldsByName) => Object.fromEntries(
    Object.entries(fieldsByName).map(([fieldName, value]) => [metaOf(entry, fieldName).id, value]),
  );

  async function findOption(type, fieldName, text) {
    const meta = metaOf(await open(type), fieldName);
    const option = (meta.property?.options ?? []).find((candidate) => candidate.name === text);
    return option ? { id: option.id, text: option.name } : null;
  }

  return {
    async tableId(type) {
      return (await open(type)).table.id;
    },

    async fieldId(type, fieldName) {
      return metaOf(await open(type), fieldName).id;
    },

    findOption,

    async addOption(type, fieldName, text) {
      const entry = await open(type);
      const field = await entry.table.getFieldById(metaOf(entry, fieldName).id);
      await field.addOption(text);
      await loadMeta(entry);
      const option = await findOption(type, fieldName, text);
      if (!option) throw new Error(`Không thêm được lựa chọn "${text}" vào cột "${fieldName}" của bảng "${entry.name}"`);
      return option;
    },

    async readRecords(type, filter) {
      const entry = await open(type);
      const records = [];
      let pageToken;
      do {
        const page = await entry.table.getRecordsByPage({
          pageSize: READ_PAGE_SIZE,
          ...(pageToken ? { pageToken } : {}),
          ...(filter ? { filter } : {}),
        });
        for (const record of page.records) {
          const fields = {};
          for (const [fieldId, value] of Object.entries(record.fields)) {
            const fieldName = entry.nameById.get(fieldId);
            if (fieldName) fields[fieldName] = value;
          }
          records.push({ recordId: record.recordId, fields });
        }
        pageToken = page.hasMore ? page.pageToken : undefined;
      } while (pageToken);
      return records;
    },

    async addRecords(type, list) {
      const entry = await open(type);
      const recordIds = [];
      for (const part of chunk(list, WRITE_CHUNK_SIZE)) {
        recordIds.push(...await entry.table.addRecords(part.map((fields) => ({ fields: toFieldIds(entry, fields) }))));
      }
      return recordIds;
    },

    async setRecords(type, list) {
      const entry = await open(type);
      for (const part of chunk(list, WRITE_CHUNK_SIZE)) {
        await entry.table.setRecords(part.map(({ recordId, fields }) => ({ recordId, fields: toFieldIds(entry, fields) })));
      }
    },

    async deleteRecords(type, recordIds) {
      const entry = await open(type);
      for (const part of chunk(recordIds, WRITE_CHUNK_SIZE)) await entry.table.deleteRecords(part);
    },

    canEdit: () => bitable.base.getPermission({ entity: 'Base', type: 'editable' }),

    currentUserId: () => bitable.bridge.getUserId(),

    async onChange(types, callback) {
      const unsubscribers = [];
      for (const type of types) {
        const { table } = await open(type);
        unsubscribers.push(table.onRecordAdd(callback), table.onRecordModify(callback), table.onRecordDelete(callback));
      }
      return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
    },
  };
}
```

- [ ] **Step 5: Chạy test, thấy qua**

Run: `node --test test/client.test.mjs`
Expected: PASS, 7 test.

- [ ] **Step 6: Commit** (bạn tự chạy)

```bash
git add js/lark/client.js test/helpers/fake-bitable.mjs test/client.test.mjs
git commit -m "feat: add thin Lark SDK client with chunked writes"
```

---

### Task 5: Đọc dữ liệu (`store.range`)

**Files:**
- Create: `js/store.js`
- Test: `test/store-range.test.mjs`

**Interfaces:**
- Consumes:
  - `createLarkClient` (Task 4).
  - `fromLark`, `vnTimestamp`, `vnDateString` (Task 3).
  - `TABLES`, `appKeysOf`, `idFieldOf`, `FIELD_TYPE`, `FILTER_OR_LIMIT`, `MAX_RANGE_DAYS` (Task 1).
- Produces:
  - `createStore({ client, now? })` trả về `{ range(from, to), batch(ops), people() }`. `batch` làm ở Task 6.
  - `range` trả `{ nhanSu, danhMuc, macDinh, thuVien, mau, chuDe, viec, bai, banGiao, tonDong, tonDongBai }`, đúng như `getRange` trong `legacy/Code.gs`.
  - `people()` trả `Array<{ ten, userId }>`.
  - `listDays(from, to): string[]`.

- [ ] **Step 1: Viết test**

`test/store-range.test.mjs`:
```js
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
```

- [ ] **Step 2: Chạy test, thấy lỗi**

Run: `node --test test/store-range.test.mjs`
Expected: FAIL, `Cannot find module .../js/store.js`.

- [ ] **Step 3: Viết phần đọc của `js/store.js`**

```js
import { FIELD_TYPE, FILTER_OR_LIMIT, MAX_RANGE_DAYS, TABLES, WRITABLE_TYPES, appKeysOf, idFieldOf } from './config.js';
import { fromLark, splitList, toLark, vnDateString, vnNowStamp, vnTimestamp } from './lark/mapper.js';

const DELAYED_STATUS = 'Trì hoãn';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const isReadableField = ([, , kind]) => kind !== 'user' && !kind.startsWith('link:');

function chunk(list, size) {
  const parts = [];
  for (let i = 0; i < list.length; i += size) parts.push(list.slice(i, i + size));
  return parts;
}

export function listDays(from, to) {
  const start = vnTimestamp(from, false);
  const end = vnTimestamp(to, false);
  if (start === null || end === null || end < start) throw new Error(`Khoảng ngày không hợp lệ: ${from} → ${to}`);
  const days = [];
  for (let ms = start; ms <= end; ms += ONE_DAY_MS) days.push(vnDateString(ms, false));
  if (days.length > MAX_RANGE_DAYS) throw new Error(`Khoảng ngày quá dài: ${days.length} ngày (tối đa ${MAX_RANGE_DAYS})`);
  return days;
}

/** range/batch đúng hợp đồng của backend Apps Script cũ (legacy/Code.gs), chạy thẳng trên SDK. */
export function createStore({ client, now = () => Date.now() }) {
  // type → (id của app → record_id của Lark)
  const indexes = new Map();
  let people = [];

  function indexOf(type) {
    if (!indexes.has(type)) indexes.set(type, new Map());
    return indexes.get(type);
  }

  function recordToObject(type, record) {
    const obj = Object.fromEntries(appKeysOf(type).map((key) => [key, '']));
    for (const [key, fieldName, kind] of TABLES[type].fields.filter(isReadableField)) {
      obj[key] = fromLark(kind, record.fields[fieldName]);
    }
    return obj;
  }

  async function readType(type, filter) {
    const records = await client.readRecords(type, filter);
    const hasIdField = idFieldOf(type) !== null;
    const index = indexOf(type);
    const objects = [];
    for (const record of records) {
      const obj = recordToObject(type, record);
      if (!Object.values(obj).some((value) => value !== '')) continue;
      if (hasIdField) {
        // Bản ghi tạo tay trong Lark chưa có id → dùng record_id; lần lưu sau sẽ ghi id này vào cột
        if (obj.id === '') obj.id = record.recordId;
        index.set(obj.id, record.recordId);
      }
      objects.push(obj);
    }
    return objects;
  }

  async function readPeople() {
    const records = await client.readRecords('nhansu');
    people = records
      .map((record) => ({ ten: fromLark('text', record.fields['Tên']), userId: record.fields['Người']?.[0]?.id ?? '' }))
      .filter((person) => person.ten);
    return people;
  }

  async function dayFilter(type, days) {
    const fieldId = await client.fieldId(type, 'Ngày');
    return {
      conjunction: 'or',
      conditions: days.map((day) => ({ fieldId, operator: 'is', value: vnTimestamp(day, false), fieldType: FIELD_TYPE.DATE_TIME })),
    };
  }

  async function viecFilter(days) {
    const filter = await dayFilter('viec', days);
    const delayed = await client.findOption('viec', 'Trạng thái', DELAYED_STATUS);
    if (!delayed) return filter;
    const fieldId = await client.fieldId('viec', 'Trạng thái');
    filter.conditions.push({ fieldId, operator: 'is', value: delayed.id, fieldType: FIELD_TYPE.SINGLE_SELECT });
    return filter;
  }

  async function readByText(type, fieldName, values) {
    const uniqueValues = [...new Set(values)].filter(Boolean);
    if (!uniqueValues.length) return [];
    const fieldId = await client.fieldId(type, fieldName);
    const parts = await Promise.all(chunk(uniqueValues, FILTER_OR_LIMIT).map((part) => readType(type, {
      conjunction: 'or',
      conditions: part.map((value) => ({ fieldId, operator: 'is', value, fieldType: FIELD_TYPE.TEXT })),
    })));
    return parts.flat();
  }

  async function range(from, to) {
    const days = listDays(from, to);
    const inRange = (obj) => obj.ngay >= from && obj.ngay <= to;
    const [chudeFilter, viecRowsFilter, baiFilter, bangiaoFilter] = await Promise.all([
      dayFilter('chude', days),
      viecFilter(days),
      dayFilter('bai', days),
      dayFilter('bangiao', days),
    ]);
    const [, danhmuc, macDinh, thuVien, mau, chuDe, viecRows, bai, banGiao] = await Promise.all([
      readPeople(),
      readType('danhmuc'),
      readType('macdinh'),
      readType('thuvien'),
      readType('mau'),
      readType('chude', chudeFilter),
      readType('viec', viecRowsFilter),
      readType('bai', baiFilter),
      readType('bangiao', bangiaoFilter),
    ]);
    const tonDong = viecRows.filter((viec) => viec.trangThai === DELAYED_STATUS);
    const tonDongBai = (await readByText('bai', 'viecId', tonDong.map((viec) => viec.id))).filter((post) => !inRange(post));
    return {
      nhanSu: people.map(({ ten }) => ({ ten })),
      danhMuc: {
        kenh: danhmuc.map((row) => row.kenh).filter(Boolean),
        dangBai: danhmuc.map((row) => row.dangBai).filter(Boolean),
        lyDo: danhmuc.map((row) => row.lyDo).filter(Boolean),
      },
      macDinh,
      thuVien,
      mau,
      chuDe: chuDe.filter(inRange),
      viec: viecRows.filter(inRange),
      bai: bai.filter(inRange),
      banGiao: banGiao.filter(inRange),
      tonDong,
      tonDongBai,
    };
  }

  async function batch() {
    throw new Error('batch: làm ở Task 6');
  }

  return { range, batch, people: () => people.map((person) => ({ ...person })) };
}
```

`splitList`, `toLark`, `vnNowStamp`, `WRITABLE_TYPES` được import sẵn cho Task 6.

- [ ] **Step 4: Chạy test, thấy qua**

Run: `node --test test/store-range.test.mjs`
Expected: PASS, 6 test.

- [ ] **Step 5: Chạy toàn bộ test**

Run: `node --test`
Expected: PASS hết.

- [ ] **Step 6: Chỉ làm nếu Task 2 báo lọc `is` theo ngày lệch số**

Thay thân `dayFilter` bằng lọc theo khoảng. Một khoảng liên tục nên không cần liệt kê từng ngày:
```js
  async function dayFilter(type, days) {
    const fieldId = await client.fieldId(type, 'Ngày');
    const start = vnTimestamp(days[0], false);
    const end = vnTimestamp(days[days.length - 1], false) + ONE_DAY_MS;
    return {
      conjunction: 'and',
      conditions: [
        { fieldId, operator: 'isGreater', value: start - 1, fieldType: FIELD_TYPE.DATE_TIME },
        { fieldId, operator: 'isLess', value: end, fieldType: FIELD_TYPE.DATE_TIME },
      ],
    };
  }
```
Lúc đó `viecFilter` phải bọc thành nhóm lồng nhau:
```js
  async function viecFilter(days) {
    const byDay = await dayFilter('viec', days);
    const delayed = await client.findOption('viec', 'Trạng thái', DELAYED_STATUS);
    if (!delayed) return byDay;
    const fieldId = await client.fieldId('viec', 'Trạng thái');
    return {
      conjunction: 'or',
      conditions: [byDay, { conjunction: 'and', conditions: [{ fieldId, operator: 'is', value: delayed.id, fieldType: FIELD_TYPE.SINGLE_SELECT }] }],
    };
  }
```
SDK giả cần thêm toán tử `isGreater` / `isLess` cho cột ngày, trong `matches` của `test/helpers/fake-bitable.mjs`:
```js
      if (condition.operator === 'isGreater') return raw > condition.value;
      if (condition.operator === 'isLess') return raw < condition.value;
```
Đặt hai dòng này trước dòng `if (condition.operator !== 'is') throw …`. Chạy lại `node --test`, phải PASS.

- [ ] **Step 7: Commit** (bạn tự chạy)

```bash
git add js/store.js test/store-range.test.mjs
git commit -m "feat: add store.range reading Lark with server-side date filters"
```

---

### Task 6: Ghi dữ liệu (`store.batch`)

**Files:**
- Modify: `js/store.js` (thay hàm `batch` giả ở Task 5)
- Test: `test/store-batch.test.mjs`

**Interfaces:**
- Consumes: `client.findOption/addOption/tableId/addRecords/setRecords/deleteRecords/readRecords` (Task 4), `toLark`, `splitList`, `vnNowStamp` (Task 3).
- Produces:
  - `batch(ops: Array<{op:'save', type, obj} | {op:'del', type, id}>): Promise<{ done: number }>`.
  - Lỗi ghi ném `Error` có message dạng `Lưu bảng "<tên bảng>" lỗi khi <sửa|thêm|xoá> <n> bản ghi: <lỗi gốc>`, giữ lỗi gốc ở `cause`.

- [ ] **Step 1: Viết test**

`test/store-batch.test.mjs`:
```js
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
```

- [ ] **Step 2: Chạy test, thấy lỗi**

Run: `node --test test/store-batch.test.mjs`
Expected: FAIL, `batch: làm ở Task 6`.

- [ ] **Step 3: Viết `batch` trong `js/store.js`**

Xoá hàm `batch` giả, thêm các hàm sau vào trong `createStore` (sau `range`):

```js
  async function ensureIndexed(type, appIds) {
    const index = indexOf(type);
    const missing = appIds.map(String).filter((id) => id && !index.has(id));
    // Đọc lại theo id trước khi coi là bản ghi mới, tránh tạo trùng khi người khác vừa tạo cùng id
    await readByText(type, idFieldOf(type), missing);
  }

  async function writeContext(type, objects) {
    const options = new Map();
    for (const [key, fieldName, kind] of TABLES[type].fields) {
      if (kind !== 'single' && kind !== 'multi') continue;
      const texts = new Set(objects.flatMap((obj) => (kind === 'multi' ? splitList(obj[key]) : [String(obj[key] ?? '').trim()])));
      texts.delete('');
      for (const text of texts) {
        const option = (await client.findOption(type, fieldName, text)) ?? (await client.addOption(type, fieldName, text));
        options.set(`${fieldName}|${text}`, option);
      }
    }
    const tableIds = new Map();
    for (const [, , kind] of TABLES[type].fields) {
      if (!kind.startsWith('link:')) continue;
      const target = kind.slice('link:'.length);
      tableIds.set(target, await client.tableId(target));
    }
    const userIdByName = new Map(people.filter((person) => person.userId).map((person) => [person.ten, person.userId]));
    return {
      option: (fieldName, text) => options.get(`${fieldName}|${text}`) ?? null,
      userId: (name) => userIdByName.get(name) ?? null,
      recordId: (target, appId) => indexOf(target).get(String(appId)) ?? null,
      tableId: (target) => tableIds.get(target) ?? null,
    };
  }

  const toLarkFields = (type, obj, ctx) => Object.fromEntries(
    TABLES[type].fields.map(([key, fieldName, kind]) => [fieldName, toLark(kind, obj[key], ctx, fieldName)]),
  );

  const dropNulls = (fields) => Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== null));

  async function guarded(type, action, count, write) {
    if (!count) return [];
    try {
      return await write();
    } catch (error) {
      throw new Error(`Lưu bảng "${TABLES[type].name}" lỗi khi ${action} ${count} bản ghi: ${error.message}`, { cause: error });
    }
  }

  async function writeType(type, typeOps, stamp) {
    const saved = typeOps.filter((op) => op.op === 'save').map((op) => ({ ...op.obj, capNhat: stamp }));
    await ensureIndexed(type, [...saved.map((obj) => obj.id), ...typeOps.filter((op) => op.op === 'del').map((op) => op.id)]);
    if (type === 'bai') await ensureIndexed('viec', saved.map((obj) => obj.viecId));
    const ctx = await writeContext(type, saved);
    const index = indexOf(type);
    const creates = new Map();
    const updates = new Map();
    const deletes = new Set();
    let done = 0;
    let savedIndex = 0;
    for (const op of typeOps) {
      if (op.op === 'del') {
        const recordId = index.get(String(op.id));
        if (!recordId || deletes.has(recordId)) continue;
        deletes.add(recordId);
        updates.delete(recordId);
        done++;
        continue;
      }
      const obj = saved[savedIndex++];
      const fields = toLarkFields(type, obj, ctx);
      const recordId = index.get(String(obj.id));
      if (recordId) updates.set(recordId, { recordId, fields });
      else creates.set(String(obj.id), dropNulls(fields));
      done++;
    }
    await guarded(type, 'sửa', updates.size, () => client.setRecords(type, [...updates.values()]));
    const createdIds = await guarded(type, 'thêm', creates.size, () => client.addRecords(type, [...creates.values()]));
    [...creates.keys()].forEach((appId, i) => index.set(appId, createdIds[i]));
    await guarded(type, 'xoá', deletes.size, () => client.deleteRecords(type, [...deletes]));
    for (const [appId, recordId] of index) if (deletes.has(recordId)) index.delete(appId);
    return done;
  }

  async function batch(ops) {
    const opsByType = new Map();
    for (const op of ops) {
      if (!WRITABLE_TYPES.includes(op.type)) throw new Error(`Không ghi được ${op.type}`);
      if (!opsByType.has(op.type)) opsByType.set(op.type, []);
      opsByType.get(op.type).push(op);
    }
    if (!people.length) await readPeople();
    const stamp = vnNowStamp(now());
    let done = 0;
    // Ghi theo WRITABLE_TYPES để bài luôn ghi sau việc
    for (const type of WRITABLE_TYPES) {
      if (opsByType.has(type)) done += await writeType(type, opsByType.get(type), stamp);
    }
    return { done };
  }
```

Bản sửa giữ cột `null` để xoá ô, giống Code.gs. Nếu Task 2 ghi rằng `null` làm lỗi, đổi `updates.set(recordId, { recordId, fields })` thành `updates.set(recordId, { recordId, fields: dropNulls(fields) })`, và sửa test đầu tiên cho khớp.

- [ ] **Step 4: Chạy test, thấy qua**

Run: `node --test`
Expected: PASS hết (11 test mới + các test cũ).

- [ ] **Step 5: Commit** (bạn tự chạy)

```bash
git add js/store.js test/store-batch.test.mjs
git commit -m "feat: add store.batch with ordered, chunked Lark writes"
```

---

### Task 7: Nhận người dùng và tải lại thông minh

**Files:**
- Create: `js/identity.js`, `js/refresh.js`
- Test: `test/identity.test.mjs`, `test/refresh.test.mjs`

**Interfaces:**
- Produces:
  - `resolveMe({ manualMe, userId, people }): { me: string, source: 'manual' | 'lark' | 'none' }`.
  - `createRefresher({ reload, isBusy, now?, debounceMs, quietMs, retryMs })` trả về `{ notifyChange(), markOwnWrite(), requestNow() }`.

- [ ] **Step 1: Viết test**

`test/identity.test.mjs`:
```js
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
```

`test/refresh.test.mjs`:
```js
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
```

- [ ] **Step 2: Chạy test, thấy lỗi**

Run: `node --test test/identity.test.mjs test/refresh.test.mjs`
Expected: FAIL, không tìm thấy `js/identity.js` và `js/refresh.js`.

- [ ] **Step 3: Viết `js/identity.js`**

```js
/** Ai đang dùng app: chọn tay (đã lưu) → khớp tài khoản Lark trong Nhân sự → chưa biết (phải hỏi). */
export function resolveMe({ manualMe, userId, people }) {
  if (manualMe) return { me: manualMe, source: 'manual' };
  const match = userId ? people.find((person) => person.userId === userId) : null;
  if (!match) return { me: '', source: 'none' };
  return { me: match.ten, source: 'lark' };
}
```

- [ ] **Step 4: Viết `js/refresh.js`**

```js
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
```

- [ ] **Step 5: Chạy test, thấy qua**

Run: `node --test`
Expected: PASS hết.

- [ ] **Step 6: Commit** (bạn tự chạy)

```bash
git add js/identity.js js/refresh.js test/identity.test.mjs test/refresh.test.mjs
git commit -m "feat: add Lark identity resolution and debounced refresher"
```

---

### Task 8: Tách Index.html thành các file (nguyên văn)

Task này chỉ chép, không sửa logic. Task 9 mới sửa.

**Files:**
- Create: `index.html`, `css/app.css`, `js/app/util.js`, `js/app/api.js`, `js/app/state.js`, `js/app/render.js`, `js/app/cay.js`, `js/app/toi.js`, `js/app/tiendo.js`, `js/app/caidat.js`, `js/app/widgets.js`, `js/app/modals.js`, `js/app/events.js`
- Create: `test/helpers/load-app.mjs`
- Test: `test/app-load.test.mjs`

**Interfaces:**
- Consumes: `legacy/Index.html` (Task 1).
- Produces:
  - Các hàm và biến toàn cục của app cũ, giữ nguyên tên: `S`, `cfg`, `load`, `render`, `commit`, `toast`, `openModal`, `closeModal`, `names`, `esc`, `$`, `DRAG`, `DRAG2`…
  - `loadApp({ nowIso? }) → { run(code), json(expr) }`: nạp mọi `js/app/*.js` theo thứ tự trong `index.html` vào `node:vm`.

- [ ] **Step 1: Kiểm tra mốc các phần trong file cũ**

```bash
cd ~/Work/plan-cp-mkt-lark
for n in 315 377 490 547 719 743 935 1043 1255 1291 1345 1814 1825 1958; do printf '%s: ' $n; sed -n "${n}p" legacy/Index.html | cut -c1-12; done
sed -n '7p;282p;314p;1968p' legacy/Index.html
```
Expected:
- Mỗi dòng của vòng lặp in `/* ==========`.
- Bốn dòng cuối in lần lượt `<style>`, `</style>`, `<script>`, `</script>`.

Lệch thì dừng lại, tìm lại mốc bằng `grep -n '^/\* =====' legacy/Index.html` và cập nhật các số trong Step 2.

- [ ] **Step 2: Cắt file**

```bash
cd ~/Work/plan-cp-mkt-lark
L=legacy/Index.html
sed -n '8,281p'     $L > css/app.css
sed -n '315,376p'   $L > js/app/util.js
sed -n '490,546p'   $L > js/app/api.js
sed -n '547,718p'   $L > js/app/state.js
sed -n '719,742p'   $L > js/app/render.js
sed -n '743,934p'   $L > js/app/cay.js
sed -n '935,1042p'  $L > js/app/toi.js
sed -n '1043,1254p' $L > js/app/tiendo.js
sed -n '1255,1290p' $L > js/app/caidat.js
{ sed -n '1291,1344p' $L; sed -n '1814,1824p' $L; } > js/app/widgets.js
sed -n '1345,1813p' $L > js/app/modals.js
sed -n '1825,1957p' $L > js/app/events.js
wc -l css/app.css js/app/*.js
```
Phần `377-489` (dữ liệu mẫu, `seedDb`) và `1958-1967` (khởi động) không chép. Task 9 thay chúng.

Tạm thời `api.js` vẫn là bản cũ, có Demo và `seedDb`. Task 9 viết lại.

- [ ] **Step 3: Viết `index.html`**

Phần `<header>`…`<div id="toast">` chép nguyên `legacy/Index.html:284-312`:
```html
<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Plan CP·MKT</title>
<link rel="stylesheet" href="css/app.css">
</head>
<body>
<header>
  <div class="hrow">
    <div class="brand">Plan CP·MKT</div>
    <span id="mode" class="mode"></span>
    <div class="ctrl">
      <div class="pill">
        <button data-act="day" data-d="-1" title="Ngày trước">‹</button>
        <input type="date" id="dateInp">
        <button data-act="day" data-d="1" title="Ngày sau">›</button>
        <button data-act="today">Hôm nay</button>
      </div>
      <div class="pill" id="caPill">
        <button data-act="ca" data-v="Sáng">☀️ Ca sáng</button>
        <button data-act="ca" data-v="Tối">🌙 Ca tối</button>
      </div>
    </div>
  </div>
  <nav id="tabs">
    <button data-tab="cay">🌳 Cây tổng thể</button>
    <button data-tab="toi">👤 Việc của tôi</button>
    <button data-tab="tiendo">📊 Tiến độ</button>
    <button data-tab="caidat">⚙️ Cài đặt</button>
  </nav>
</header>
<main id="app"><div class="empty">Đang kết nối Lark Base…</div></main>
<div id="menu"></div>
<div id="modal" class="modal hidden"><div class="sheet" id="sheet"></div></div>
<div id="toast"></div>
<!-- Classic script, chung phạm vi toàn cục, đúng thứ tự cũ. main.js (module) chạy sau cùng. -->
<script src="js/app/util.js"></script>
<script src="js/app/api.js"></script>
<script src="js/app/state.js"></script>
<script src="js/app/render.js"></script>
<script src="js/app/cay.js"></script>
<script src="js/app/toi.js"></script>
<script src="js/app/tiendo.js"></script>
<script src="js/app/caidat.js"></script>
<script src="js/app/widgets.js"></script>
<script src="js/app/modals.js"></script>
<script src="js/app/events.js"></script>
<script type="module" src="js/main.js"></script>
</body>
</html>
```

So khớp phần thân với bản cũ: `diff <(sed -n '284,312p' legacy/Index.html) <(sed -n '9,37p' index.html)`.
Expected: chỉ khác dòng `<main id="app">`.

- [ ] **Step 4: Viết helper nạp app vào Node**

`test/helpers/load-app.mjs`:
```js
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// App cũ tính ca và ngày làm việc theo giờ máy; người dùng ở VN
process.env.TZ = 'Asia/Ho_Chi_Minh';

const ROOT = new URL('../../', import.meta.url);

export function appScriptPaths() {
  const html = readFileSync(new URL('index.html', ROOT), 'utf8');
  return [...html.matchAll(/<script src="(js\/app\/[^"]+)"><\/script>/g)].map((match) => match[1]);
}

function elementStub() {
  return {
    value: '', textContent: '', className: '', innerHTML: '', style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, focus() {},
  };
}

export function loadApp({ nowIso } = {}) {
  const storage = new Map();
  const document = {
    addEventListener() {}, getElementById: () => elementStub(), querySelector: () => null,
    querySelectorAll: () => [], createElement: () => elementStub(), activeElement: null, body: elementStub(),
  };
  const context = {
    console, document, setTimeout, clearTimeout, navigator: {}, scrollX: 0, scrollY: 0,
    requestAnimationFrame: () => 0, scrollTo() {}, isSecureContext: false,
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
  };
  context.window = context;
  vm.createContext(context);
  if (nowIso) {
    const fixedMs = Date.parse(nowIso);
    vm.runInContext(`(() => {
      const RealDate = Date;
      class FixedDate extends RealDate {
        constructor(...args) { super(...(args.length ? args : [${fixedMs}])); }
        static now() { return ${fixedMs}; }
      }
      globalThis.Date = FixedDate;
    })();`, context);
  }
  for (const path of appScriptPaths()) {
    vm.runInContext(readFileSync(new URL(path, ROOT), 'utf8'), context, { filename: path });
  }
  const run = (code) => vm.runInContext(code, context);
  return { run, json: (expression) => JSON.parse(run(`JSON.stringify(${expression})`)) };
}
```

- [ ] **Step 5: Viết test nạp app**

`test/app-load.test.mjs`:
```js
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { appScriptPaths, loadApp } from './helpers/load-app.mjs';

test('index.html nạp đủ 11 file giao diện theo đúng thứ tự', () => {
  assert.deepEqual(appScriptPaths(), [
    'js/app/util.js', 'js/app/api.js', 'js/app/state.js', 'js/app/render.js', 'js/app/cay.js', 'js/app/toi.js',
    'js/app/tiendo.js', 'js/app/caidat.js', 'js/app/widgets.js', 'js/app/modals.js', 'js/app/events.js',
  ]);
});

test('nạp app không lỗi và có đủ các hàm chính', () => {
  const app = loadApp({ nowIso: '2026-10-16T10:00:00+07:00' });
  for (const name of ['render', 'load', 'commit', 'toast', 'openModal', 'renderCay', 'renderToi', 'renderTienDo', 'renderCaiDat']) {
    assert.equal(app.run(`typeof ${name}`), 'function', name);
  }
  assert.equal(app.run('S.date'), '2026-10-16');
});
```

- [ ] **Step 6: Chạy test**

Run: `node --test test/app-load.test.mjs`
Expected: PASS. Ở bước này `api.js` cũ vẫn gọi `seedDb` trong `Demo.reset` nhưng chỉ khi được gọi, nên nạp vẫn không lỗi.

Nếu lỗi `ReferenceError` lúc nạp: mở file mà stack trace chỉ tới. Tìm biến toàn cục đang bị dùng ngay lúc nạp mà nằm ở file nạp sau, rồi báo lại trước khi đổi thứ tự.

- [ ] **Step 7: Commit** (bạn tự chạy)

```bash
git add index.html css/app.css js/app test/helpers/load-app.mjs test/app-load.test.mjs
git commit -m "refactor: split legacy Index.html into static files verbatim"
```

---

### Task 9: Bỏ phần dính Google, nối Lark và khởi động

**Files:**
- Modify (toàn bộ): `js/app/api.js`
- Modify:
  - `js/app/util.js` (dòng `const ls`)
  - `js/app/state.js` (`load`, `commit`, xoá `poolFor`)
  - `js/app/render.js` (nhãn trạng thái)
  - `js/app/caidat.js` (thẻ kết nối, gợi ý Nhân sự)
  - `js/app/events.js` (xoá các case Google/Demo, thêm `setme`)
- Create: `js/main.js`
- Test: `test/domain.test.mjs`, `test/app-commit.test.mjs`

**Interfaces:**
- Consumes:
  - `createLarkClient` (Task 4), `createStore` (Task 5–6), `resolveMe` và `createRefresher` (Task 7).
  - `load`, `render`, `cfg`, `S`, `names`, `openModal` của app cũ (Task 8).
- Produces:
  - `window.PlanStore = { range(from, to), batch(ops) }`.
  - Toàn cục mới: `APP_ENV = { readOnly: boolean }`, `canAutoRefresh(): boolean`, `askWhoAmI(): void`.

- [ ] **Step 1: Viết test luật nghiệp vụ (chạy trên code cũ đã tách, đã qua được)**

`test/domain.test.mjs`:
```js
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadApp } from './helpers/load-app.mjs';

const at = (nowIso) => loadApp({ nowIso });

test('ngày làm việc đổi lúc 05:00', () => {
  assert.equal(at('2026-10-17T04:59:00+07:00').run('workday()'), '2026-10-16');
  assert.equal(at('2026-10-17T05:00:00+07:00').run('workday()'), '2026-10-17');
});

test('ca hiện tại: 17:00 sang ca tối, qua nửa đêm vẫn là ca tối', () => {
  assert.equal(at('2026-10-16T16:59:00+07:00').run('curCa()'), 'Sáng');
  assert.equal(at('2026-10-16T17:00:00+07:00').run('curCa()'), 'Tối');
  assert.equal(at('2026-10-17T00:30:00+07:00').run('curCa()'), 'Tối');
});

test('giờ sau nửa đêm tính sang ngày hôm sau', () => {
  const app = at('2026-10-16T10:00:00+07:00');
  assert.equal(app.run("mins('01:00')"), 1500);
  assert.equal(app.run("mkDT('2026-10-16', '01:00')"), '2026-10-17 01:00');
  assert.equal(app.run("mkDT('2026-10-16', '23:00')"), '2026-10-16 23:00');
});

test('giờ nằm ngoài ca thì chuyển thành việc cả ca', () => {
  const app = at('2026-10-16T10:00:00+07:00');
  assert.deepEqual(app.json("fitShift('Sáng', '', '18:00', '19:00')"), { caCa: '1', batDau: '', ketThuc: '' });
  assert.deepEqual(app.json("fitShift('Sáng', '', '09:00', '10:00')"), { caCa: '', batDau: '09:00', ketThuc: '10:00' });
});

test('quá giờ: việc chưa xong của ngày trước', () => {
  const app = at('2026-10-16T10:00:00+07:00');
  assert.equal(app.run("isLate({ trangThai: 'Chưa làm', ngay: '2026-10-15', ca: 'Sáng' })"), true);
  assert.equal(app.run("isLate({ trangThai: 'Xong', ngay: '2026-10-15', ca: 'Sáng' })"), false);
  assert.equal(app.run("isLate({ trangThai: 'Trì hoãn', ngay: '2026-10-15', ca: 'Sáng' })"), false);
});
```

Run: `node --test test/domain.test.mjs`
Expected: PASS ngay. Test này khoá hành vi cũ trước khi sửa.

- [ ] **Step 2: Viết test cho lưu lỗi và chế độ chỉ xem**

`test/app-commit.test.mjs`:
```js
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadApp } from './helpers/load-app.mjs';

function setup(batchImpl) {
  const app = loadApp({ nowIso: '2026-10-16T10:00:00+07:00' });
  app.run(`
    globalThis.__calls = { toasts: [], loads: 0, batches: 0 };
    toast = (msg, err) => { __calls.toasts.push({ msg, err: !!err }); };
    load = async () => { __calls.loads++; };
    render = () => {};
  `);
  app.run('window.PlanStore = { range: async () => ({}), batch: null };');
  app.run('window.PlanStore.batch = async (ops) => { __calls.batches++; return __batchImpl(ops); };');
  app.run(`globalThis.__batchImpl = ${batchImpl};`);
  return app;
}

const OP = "sv('bangiao', { id: 'bg1', ngay: '2026-10-16', ca: 'Sáng', mang: 'Shopee', ghiChu: 'x' })";

test('Lark lỗi khi lưu: báo lỗi đỏ nêu lý do rồi tải lại dữ liệu thật', async () => {
  const app = setup("async () => { throw new Error('Lưu bảng \"Bàn giao\" lỗi khi thêm 1 bản ghi: mất mạng'); }");
  await app.run(`commit([${OP}])`);
  const calls = app.json('__calls');
  assert.equal(calls.batches, 1);
  assert.equal(calls.loads, 1);
  assert.ok(calls.toasts.some((t) => t.err && /mất mạng/.test(t.msg) && /tải lại/.test(t.msg)), JSON.stringify(calls.toasts));
});

test('chỉ có quyền xem: không lưu, không đổi màn hình, báo lý do', async () => {
  const app = setup('async () => ({ done: 1 })');
  app.run('APP_ENV.readOnly = true;');
  await app.run(`commit([${OP}])`);
  const calls = app.json('__calls');
  assert.equal(calls.batches, 0);
  assert.equal(app.run('S.banGiao.length'), 0);
  assert.ok(calls.toasts.some((t) => t.err && /chỉ có quyền xem/.test(t.msg)));
});

test('lưu thành công thì gọi PlanStore.batch và hiện thông báo', async () => {
  const app = setup('async () => ({ done: 1 })');
  await app.run(`commit([${OP}], 'Đã lưu')`);
  const calls = app.json('__calls');
  assert.equal(calls.batches, 1);
  assert.equal(calls.loads, 0);
  assert.deepEqual(calls.toasts, [{ msg: 'Đã lưu', err: false }]);
});
```

Run: `node --test test/app-commit.test.mjs`
Expected: FAIL. Chưa có `APP_ENV`, và `apiBatch` cũ còn đi đường Demo.

- [ ] **Step 3: Viết lại `js/app/api.js`**

Thay toàn bộ nội dung file:
```js
/* =====================================================================
   KHO DỮ LIỆU: Lark Base qua window.PlanStore (js/main.js gắn vào)
   ===================================================================== */
const CFG_KEY = 'plancpmkt3_cfg', FOLD_KEY = 'plancpmkt3_fold';
const cfg = Object.assign({ me: '' }, ls.get(CFG_KEY) || {});
delete cfg.url;
const KEYS = { chude: 'chuDe', viec: 'viec', bai: 'bai', bangiao: 'banGiao', thuvien: 'thuVien', mau: 'mau', macdinh: 'macDinh' };
const APP_ENV = { readOnly: false };
async function apiRange(from, to){ return window.PlanStore.range(from, to); }
async function apiBatch(ops){ return window.PlanStore.batch(ops); }
// Đang mở form, kéo thả hoặc gõ chữ thì không tải lại, tránh đè thứ người dùng đang làm
function canAutoRefresh(){
  if (!$('modal').classList.contains('hidden') || DRAG || DRAG2 || document.querySelector('.msel.open')) return false;
  const a = document.activeElement;
  return !(a && ['INPUT','TEXTAREA','SELECT'].includes(a.tagName));
}
function askWhoAmI(){
  const ns = names(); if (!ns.length) return;
  openModal(`<h3>Bạn là ai?</h3><div class="hint">Chọn tên của bạn để app lọc đúng "Việc của tôi". Chọn một lần, máy này sẽ nhớ.</div>
    <div class="f"><select id="whoSel" class="btn">${ns.map(n => `<option>${esc(n)}</option>`).join('')}</select></div>
    <div class="bar"><button class="btn pri" data-act="setme">Lưu</button></div>`);
}
```
`KEYS` chép đúng dòng cũ `legacy/Index.html:495`. So lại: `sed -n 495p legacy/Index.html`. Nếu khác thì lấy bản cũ.

- [ ] **Step 4: Sửa `js/app/util.js`: không nuốt lỗi localStorage im lặng**

Thay dòng `const ls = …`:
```js
const ls = { get(k){ try { return JSON.parse(localStorage.getItem(k)); } catch(e){ console.warn('Không đọc được localStorage', k, e); return null; } }, set(k,v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){ console.warn('Không ghi được localStorage', k, e); } } };
```

- [ ] **Step 5: Sửa `js/app/state.js`**

(a) Trong `load`, thay dòng `catch`:
```js
  } catch (e) { S.err = e.message; toast('Không tải được dữ liệu: ' + e.message, true); }
```
bằng:
```js
  } catch (e) { console.error('Tải dữ liệu Lark lỗi', { from: r.from, to: r.to, error: e }); S.err = e.message; toast('Không tải được dữ liệu: ' + e.message, true, 'Thử lại', () => load()); }
```

(b) Thay toàn bộ hàm `commit`:
```js
async function commit(ops, msg){
  if (!ops.length) { if (msg) toast(msg); return; }
  if (APP_ENV.readOnly) { toast('Bạn chỉ có quyền xem Base này nên không lưu được. Nhờ người quản lý Base cấp quyền sửa.', true); return; }
  applyLocal(ops); render();
  try { await apiBatch(ops); if (msg) toast(msg); }
  catch (e) {
    console.error('Lưu lên Lark lỗi', { ops: ops.length, error: e });
    toast('Lưu lỗi: ' + e.message + ' · đang tải lại dữ liệu thật', true);
    load(true);
  }
}
```

(c) Xoá hàm `poolFor` (code chết). Kiểm tra trước: `grep -rn 'poolFor' js/app` chỉ ra đúng dòng định nghĩa. Xoá từ dòng `function poolFor(` tới dòng `}` ngay trước `function nhomsOf(`.

- [ ] **Step 6: Sửa `js/app/render.js`: nhãn trạng thái**

Thay hai dòng:
```js
  m.textContent = online() ? (S.err ? '⚠️ Lỗi kết nối' : '● Google Sheet') : 'Chế độ thử – dữ liệu mẫu';
  m.className = 'mode' + (online() ? '' : ' demo');
```
bằng:
```js
  m.textContent = S.err ? '⚠️ Lỗi kết nối' : APP_ENV.readOnly ? '👁 Chỉ xem' : '● Lark Base';
  m.className = 'mode' + (APP_ENV.readOnly ? ' demo' : '');
```

- [ ] **Step 7: Sửa `js/app/caidat.js`**

(a) Câu lệnh `let h = …` đầu tiên trong `renderCaiDat` kéo dài 11 dòng: từ dòng chứa `${GAS ?` tới dòng chứa `data-act="pushseed"`. Kiểm tra trước:
`sed -n '5p;15p' js/app/caidat.js | cut -c1-60`.
Expected:
- Dòng 5 bắt đầu bằng `  let h = \`<div class="grid2">${GAS ?`.
- Dòng 15 chứa `pushseed`.

Thay 11 dòng đó bằng:
```js
  let h = `<div class="grid2"><div class="card sec"><h3>🔗 Kết nối</h3><div class="allok">● Đang đọc và ghi thẳng Lark Base</div><div class="hint" style="margin-top:8px">Mọi thay đổi lưu vào Base bằng quyền Lark của bạn${APP_ENV.readOnly ? ' — bạn đang ở <b>chế độ chỉ xem</b>' : ''}. Thêm, sửa dữ liệu gốc (Nhân sự, Danh mục) ngay trong các bảng của Base.</div></div></div>`;
```

(b) Thay chuỗi `Thêm / bớt người trong tab <code>NhanSu</code> của Google Sheet.` bằng `Thêm / bớt người trong bảng <code>Nhân sự</code> của Lark Base.`

- [ ] **Step 8: Sửa `js/app/events.js`**

Kiểm tra handler `hall` / `hbo` có còn nút nào sinh ra không: `grep -rn "hall\|hbo" js/app | grep -v "case '"`. Không có kết quả thì là code chết, xoá được. Có kết quả (còn nút sinh ra `hall`/`hbo`) thì giữ nguyên hai case đó, chỉ xoá 5 case còn lại.

Xoá các dòng `case` sau trong `switch (a)`. Mỗi case nằm gọn một dòng; kiểm tra bằng `grep -n "case 'hall'\|case 'hbo'\|case 'saveurl'\|case 'clearurl'\|case 'ping'\|case 'resetdemo'\|case 'pushseed'" js/app/events.js`:
- `case 'hall'`, `case 'hbo'`
- `case 'clearurl'`, `case 'ping'`, `case 'resetdemo'`, `case 'pushseed'`

Dòng `case 'saveurl'` thì thay bằng:
```js
    case 'setme': cfg.me = $('whoSel').value; ls.set(CFG_KEY, cfg); closeModal(); render(); break;
```

- [ ] **Step 9: Kiểm tra không còn dấu vết Google**

```bash
grep -rnE "online\(\)|\bGAS\b|Demo\b|DEMO_KEY|apiPing|seedDb|pushseed|cfg\.url|Google|Data_PhanTich|google\.script|poolFor" js/app index.html
```
Expected: không có kết quả. Còn dòng nào thì sửa cho hết, theo đúng tinh thần các bước trên.

- [ ] **Step 10: Viết `js/main.js`**

```js
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
```

- [ ] **Step 11: Chạy toàn bộ test**

Run: `node --test`
Expected: PASS hết, gồm `test/app-commit.test.mjs` (3 test) và `test/domain.test.mjs` (5 test).

- [ ] **Step 12: Mở ngoài Lark để kiểm tra màn báo lỗi**

Server dev vẫn chạy. Mở `http://127.0.0.1:5190/index.html` bằng trình duyệt trong app.
- Expected: trang hiện "Hãy mở Plan CP·MKT trong Lark Base…".
- Console không có lỗi `ReferenceError`. Đọc bằng `read_console_messages`.

- [ ] **Step 13: Commit** (bạn tự chạy)

```bash
git add js/app js/main.js test/domain.test.mjs test/app-commit.test.mjs
git commit -m "feat: wire legacy UI to Lark store and remove Google remnants"
```

---

### Task 10: Chạy thật trong Base test

Không có code mới trừ khi tìm ra lỗi. Mọi lỗi tìm ra thì sửa theo quy trình:
1. Viết test tái hiện (nếu thuộc lớp dữ liệu hoặc luật nghiệp vụ).
2. Sửa.
3. Chạy `node --test`.

**Files:**
- Modify: chỉ khi sửa lỗi.
- Modify: `/Users/piggi/KNOWLEDGE.md` (mục "Lark MCP + Lark Base — chỗ dễ vấp").

- [ ] **Step 1: Gắn extension dev vào Base test**

Base test → Extensions → Custom → **+ New Extension**: Name `Plan CP·MKT (dev)`, URL `http://127.0.0.1:5190/index.html`. Kéo panel rộng ra khoảng nửa màn hình.

- [ ] **Step 2: Cây tổng thể**

Dùng Chrome (claude-in-chrome), chụp màn hình từng mục:
- [ ] Chọn ngày có dữ liệu, đổi ca Sáng/Tối: cây hiện đủ mảng, chủ đề, việc; đường nối vẽ đúng.
- [ ] Thêm chủ đề, thêm việc, sửa việc, đổi trạng thái, xoá rồi hoàn tác. Sau mỗi thao tác mở bảng tương ứng trong Base, thấy đúng bản ghi.
- [ ] Dán mẫu cho một ca trống. Phân công từ cây.
- [ ] Trì hoãn một việc sang ngày khác: việc hiện ở tồn đọng.
- [ ] Bàn giao ca tối.
- [ ] Kéo thả chủ đề và việc.
- [ ] Menu ⋯ và ô chọn nhiều người (`position:fixed`) mở đúng chỗ, không bị cắt trong panel; cuộn cây ngang/dọc thì menu đóng lại.
- [ ] Đối chiếu một ngày với bản Apps Script (dashboard "Cây kế hoạch" của Base chính): cùng ngày, cùng ca thì cây giống nhau. Lúc này hai Base có cùng dữ liệu vì Base test vừa được sao chép.

- [ ] **Step 3: Việc của tôi**

- [ ] Mở lần đầu: "Tôi là" tự điền đúng tên tài khoản Lark. Nếu tài khoản không có trong Nhân sự thì hiện "Bạn là ai?".
- [ ] Đổi tay "Tôi là", tải lại extension (menu … → Refresh): vẫn giữ lựa chọn tay.
- [ ] Nhập idea, link, số liệu bài đăng. Kiểm tra bảng Bài đăng có liên kết sang Việc.
- [ ] Bấm 🔗 mở bài (`target=_blank` trong iframe): mở được tab mới.

- [ ] **Step 4: Tiến độ**

- [ ] Xem theo ca, ngày, tuần: số liệu khớp dữ liệu.
- [ ] Nút copy danh sách "Ai còn thiếu cập nhật" (clipboard trong iframe): dán ra được. Không được thì xem `fallbackCopy` có chạy không và ghi lại.

- [ ] **Step 5: Cài đặt**

- [ ] Thẻ "Kết nối" hiện đúng.
- [ ] Sửa phân công mảng, lưu khối mẫu, xoá mục danh sách chọn nhanh: dữ liệu vào Base.

- [ ] **Step 6: Tải lại và lỗi**

- [ ] Sửa một ô trong bảng Việc trực tiếp trên Base: khoảng 1–2 giây sau cây tự cập nhật.
- [ ] Đang mở form sửa việc thì sửa Base ở chỗ khác: form không bị đè, đóng form xong cây mới cập nhật.
- [ ] Tạm đổi tên cột `Ghi chú` trong bảng Bàn giao của Base test rồi lưu bàn giao: hiện lỗi đỏ nêu rõ bảng và cột, cây tải lại. Đổi tên cột lại như cũ.
- [ ] Nhờ một người chỉ có quyền xem Base test mở extension, hoặc tạm hạ quyền một tài khoản thử: nhãn "👁 Chỉ xem", bấm lưu thì có thông báo.

- [ ] **Step 7: Ghi kiến thức mới**

Thêm vào `/Users/piggi/KNOWLEDGE.md`, mục "Lark MCP (`@larksuiteoapi/lark-mcp`) + Lark Base — chỗ dễ vấp", chỉ những điều mới thấy ở Task 2 và Task 10, mỗi ý một gạch đầu dòng. Ví dụ: dạng ghi liên kết thực tế, `getUserId` có khớp cột Người không, clipboard và `target=_blank` trong iframe extension.

- [ ] **Step 8: Commit** (bạn tự chạy, nếu có sửa lỗi)

```bash
git add -A
git commit -m "fix: address issues found testing extension in Lark"
```

---

### Task 11: Deploy GitHub Pages và gắn vào Base chính

**Files:**
- Modify: `README.md` (thêm URL và cách cập nhật)

- [ ] **Step 1: Bạn tạo repo và push** (bạn tự làm)

1. Trên GitHub tạo repo public `plan-cp-mkt-lark`, không tạo README.
2. Chạy:
   ```bash
   cd ~/Work/plan-cp-mkt-lark
   git remote add origin git@github.com:<tài-khoản>/plan-cp-mkt-lark.git
   git push -u origin main
   ```
3. Settings → Pages → Source **Deploy from a branch**, Branch `main`, thư mục `/ (root)` → Save.

- [ ] **Step 2: Kiểm tra bản trên Pages**

Mở `https://<tài-khoản>.github.io/plan-cp-mkt-lark/` bằng trình duyệt trong app.
Expected: hiện "Hãy mở Plan CP·MKT trong Lark Base…" (đúng như ngoài Lark). Console không có lỗi 404 khi tải `js/…` hay `css/…`.

- [ ] **Step 3: Thử bản Pages trên Base test trước**

Sửa extension `Plan CP·MKT (dev)` của Base test (… → Edit), đổi URL sang địa chỉ Pages. Mở, xem cây và lưu thử một việc. Xong đổi URL về `http://127.0.0.1:5190/index.html`.

- [ ] **Step 4: Gắn vào Base chính** (hỏi bạn trước khi làm)

Base chính → Extensions → Custom → + New Extension: Name `Plan CP·MKT`, URL địa chỉ Pages → **Pin to sidebar**.
Extension trên Base chính chỉ đọc cho tới khi có người lưu. Nhắc team: chừng nào chưa chuyển hẳn sang Lark (ngoài phạm vi), dữ liệu thật vẫn đang ở app cũ.

- [ ] **Step 5: Thử khối dashboard "Add custom"**

Dashboard "Cây kế hoạch" của Base test → Add Block → Extensions → **Add custom** → dán URL Pages.
- Được, và cây dùng tốt khi rộng: báo bạn để quyết định có thay khối Embeds (Apps Script) ở Base chính không.
- Không được: ghi lý do vào `docs/sdk-notes.md`, dùng thanh bên.

- [ ] **Step 6: Cập nhật README**

Thêm vào cuối `README.md`:
```markdown
## Bản chạy thật
- URL: https://<tài-khoản>.github.io/plan-cp-mkt-lark/
- Cập nhật: push lên `main`, khoảng 1 phút sau GitHub Pages có bản mới; trong Lark bấm … → Refresh ở extension.
- Base chính: Extensions → Plan CP·MKT (đã ghim). Base test: "Plan CP·MKT – test", extension "Plan CP·MKT (dev)" trỏ server trên máy.
```

- [ ] **Step 7: Commit** (bạn tự chạy)

```bash
git add README.md
git commit -m "docs: document GitHub Pages deployment and Lark setup"
git push
```
