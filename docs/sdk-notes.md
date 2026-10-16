# Ghi chú SDK (thăm dò 2026-10-16 trên Base test)

Base test: "Plan CP·MKT – test", https://<tenant>.larksuite.com/base/<APP_TOKEN_BASE_TEST>
Sao chép đủ cấu hình và dữ liệu; bản sao không mang theo automation nào (0/0).
Trang thăm dò: `tools/probe.html`. Báo cáo gốc: `tmp/probe-report.json` (không đưa lên git).

| Câu hỏi | Kết quả | Quyết định cho code |
|---|---|---|
| Text đọc ra dạng gì | Mảng segment `[{ type: 'text', text }]` | mapper đọc mảng segment, nối `text` |
| Ghi text bằng segment | Được | dùng `[{ type: 'text', text }]` |
| Ghi text bằng chuỗi trơn | Cũng được (đọc lại ra segment) | không cần, giữ segment cho rõ |
| Ghi `null` có xoá ô | Xoá được (text và chọn một) | bản sửa gửi `null` như Code.gs |
| Lọc ngày `is` + mốc 00:00 VN | expected=49, got=49 | dùng `is` cho từng ngày |
| Ghi liên kết | Dạng object `{ text, type, recordIds, tableId }` đọc lại đúng; dạng mảng id **bị bỏ qua im lặng** (ô trống) | dùng dạng object |
| Ghi URL | `[{ type: 'url', text, link }]` đọc lại đúng | như mapper |
| Ghi người dùng | `[{ id }]` đọc lại đúng | như mapper |
| `getFieldById(...).addOption(name)` | Thêm được, có id mới | dùng trong client.addOption |
| `getPermission({ entity: 'Base', type: 'editable' })` | `true` với chủ Base | dùng cho chế độ chỉ xem |
| `bridge.getUserId()` | Trả `open_id` dạng `ou_…`, giống `getBaseUserId()`, cùng hệ id với cột Người của Nhân sự | so khớp thẳng với id trong cột Người |
| Bảng thừa | Base còn bảng "Mẫu việc" (chờ người dùng xoá) | app không đọc bảng này |

Ghi chú thêm:
- Bảng Bàn giao có thêm cột hệ thống (thời điểm tạo, người tạo); app không đụng tới.
- Bài đăng và Bàn giao đang 0 bản ghi nên fixture không có mẫu cho hai bảng này.
- Fixture `test/fixtures/sdk-sample.json` đã thay id người dùng thật bằng `ou_sampleN` và bỏ tên, vì repo public.
