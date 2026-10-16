# Plan CP·MKT trên Lark Base — thiết kế extension

Ngày: 2026-10-16 · Trạng thái: chờ duyệt

## 1. Mục tiêu

Đưa app lên kế hoạch ca Coupon + MKT (bản Apps Script, `Index.html` + `Code.gs`) vào thẳng Lark Base dưới dạng **extension tự viết**:

- Không còn phụ thuộc Google Apps Script: không Code.gs, không App ID/Secret, không Google Sheet.
- Giữ nguyên giao diện và cách dùng hiện tại, đủ 4 tab: **Cây tổng thể, Việc của tôi, Tiến độ, Cài đặt**.
- Đọc và ghi trực tiếp Base https://<tenant>.larksuite.com/base/<APP_TOKEN_BASE_CHINH> bằng `@lark-base-open/js-sdk`.

**Thành công khi:** cả team mở extension trong Lark (web và desktop), thấy cây đúng như bản Apps Script, tạo/sửa/xoá/dán mẫu/bàn giao được, và dữ liệu nằm trong Base.

**Ngoài phạm vi:** chuyển hẳn sang Lark (chạy lại `sync.py`, tắt app cũ, bật 2 automation nhắc quá giờ). Đây là bước riêng, làm sau khi extension chạy ổn.

## 2. Các quyết định đã chốt

| Câu hỏi | Chốt |
|---|---|
| Host | GitHub Pages, repo public; người dùng tự tạo repo và push |
| Phạm vi | Đủ 4 tab |
| Mã nguồn | `~/Work/plan-cp-mkt-lark` |
| Nhận người dùng | Tự nhận theo tài khoản Lark, vẫn cho đổi tay "Tôi là" |
| Hướng làm | A: giữ giao diện cũ, tách module, viết mới lớp dữ liệu bằng SDK |
| Build | Không có bước build, không cài package; file chạy thẳng trên trình duyệt (lớp dữ liệu là ES module, giao diện là classic script) |
| Test ghi | Trên bản sao Base "Plan CP·MKT – test", không đụng Base chính |

## 3. Cấu trúc thư mục

```
index.html              khung trang (tách từ Index.html)
css/app.css             CSS cũ, giữ nguyên
js/main.js              khởi động: SDK → nhận người dùng → tải dữ liệu → vẽ
js/config.js            tên bảng + bảng ánh xạ cột (chép từ T trong Code.gs), hằng số mảng/màu/giờ ca
js/lark/mapper.js       đổi giá trị Lark ↔ giá trị app (hàm thuần)
js/lark/client.js       lớp mỏng bọc SDK: đọc theo trang có lọc, thêm/sửa/xoá theo lô, nghe sự kiện, kiểm tra quyền
js/store.js             range(from, to) và batch(ops), đúng hợp đồng của backend cũ
js/identity.js          ai đang mở extension
js/refresh.js           khi nào tải lại: gộp sự kiện, bỏ qua sự kiện do mình ghi, hoãn khi đang sửa
js/app/*.js             giao diện + luật nghiệp vụ tách nguyên văn từ Index.html (classic script, chung phạm vi toàn cục)
test/*.test.mjs         node:test cho mapper, client, store (SDK giả), identity, refresh; luật nghiệp vụ nạp js/app/*.js qua node:vm
docs/                   spec, kế hoạch, ghi chú SDK
```

Các file `js/lark/*`, `js/store.js`, `js/identity.js`, `js/refresh.js` là ES module và không chạm DOM. `js/app/*.js` giữ dạng classic script vì code cũ dùng hơn 200 hàm và biến toàn cục gọi chéo nhau; chuyển sang `import`/`export` là viết lại toàn bộ mà không thêm giá trị.

SDK nạp cố định phiên bản: `https://cdn.jsdelivr.net/npm/@lark-base-open/js-sdk@1.0.2/dist/index.mjs`. Để test được bằng Node, `client.js` nhận đối tượng `bitable` qua tham số, không tự import.

## 4. Hợp đồng dữ liệu (giữ như backend cũ)

Giao diện chỉ gọi hai hàm:

- `store.range(from, to)` trả về `{ nhanSu, danhMuc, macDinh, thuVien, mau, chuDe, viec, bai, banGiao, tonDong, tonDongBai }`, đúng như `getRange` trong Code.gs:
  - `chuDe`, `viec`, `bai`, `banGiao`: bản ghi có `ngay` trong `[from, to]`.
  - `tonDong`: mọi việc có `trangThai = 'Trì hoãn'`, không phụ thuộc ngày.
  - `tonDongBai`: bài thuộc việc tồn đọng nằm ngoài khoảng ngày.
  - `nhanSu`: `[{ ten }]`; `danhMuc`: `{ kenh[], dangBai[], lyDo[] }`.
- `store.batch(ops)` với `ops = [{ op: 'save', type, obj } | { op: 'del', type, id }]`. Chỉ ghi được các type `chude, viec, bai, bangiao, thuvien, mau, macdinh`. Trả `{ done: n }`.

Mọi giá trị trong app vẫn là chuỗi, như hiện nay.

## 5. Lớp dữ liệu

### 5.1 Ánh xạ bảng và cột
`config.js` chép nguyên `T` trong Code.gs: mỗi type gồm tên bảng Lark và danh sách `[khoá app, tên cột Lark, kiểu]`. App lấy bảng theo **tên** (`getTableByName`), nên chạy được trên cả Base chính lẫn bản sao test. Lúc khởi động, app đọc `getFieldMetaList` một lần để map tên cột ↔ field id và lấy danh sách lựa chọn.

### 5.2 Đổi kiểu (`mapper.js`)
Đọc giá trị gốc (không dùng `stringValue`), vì dạng chữ của cột ngày phụ thuộc định dạng hiển thị.

| Kiểu | Lark → app | App → Lark |
|---|---|---|
| `text` | ghép các đoạn `text` | chuỗi |
| `single` | tên lựa chọn | lựa chọn theo tên; chưa có thì thêm vào cột (`addOption`) rồi ghi |
| `multi` | nối bằng `", "` | tách theo dấu phẩy, mỗi phần như `single` |
| `num` | `String(Number(v))` | số; chuỗi rỗng hoặc không phải số → bỏ trống |
| `check` | `'1'` / `''` | true nếu không phải `''`, `'0'`, `'false'` |
| `date` | `YYYY-MM-DD` theo giờ VN | mốc 00:00 +07:00 |
| `datetime` | `YYYY-MM-DD HH:mm` theo giờ VN | mốc tương ứng +07:00 |
| `url` | `link` | `{ link, text }` |
| `user` | không đọc; app dùng cột "Tên người (gốc)" như Code.gs | tên trong Nhân sự → id người dùng; tên không có tài khoản thì bỏ trống |
| `link:viec` | không đọc; app dùng cột `viecId` | `viecId` → record_id của việc |

Cột công thức (Hạn chót, Quá giờ) không có trong ánh xạ nên không bao giờ bị ghi. Giờ VN tính bằng phép cộng +7 giờ cố định (Việt Nam không đổi giờ mùa hè), không phụ thuộc múi giờ máy người dùng.

Id người dùng được đọc từ cột **Người** của bảng Nhân sự **qua SDK**. Vì vậy id dùng để ghi và id của `bridge.getUserId()` cùng một hệ, không lẫn với `open_id` của OpenAPI.

### 5.3 Đọc (`range`)
- **Bảng nhỏ** (Nhân sự, Danh mục, Phân công mặc định, Thư viện, Mẫu): đọc hết mỗi lần `range`, song song với bảng lớn. Các bảng này nhỏ nên chỉ tốn vài chục mili-giây, đổi lại không phải giữ và làm mới bộ đệm.
- **Bảng lớn**, lọc ngay khi hỏi Lark bằng `filter` của `getRecordsByPage`:
  - Chủ đề, Bàn giao: `Ngày` trong `[from, to]`.
  - Việc: `Ngày` trong `[from, to]` **hoặc** `Trạng thái = Trì hoãn`, gộp cả `tonDong` trong một lần đọc.
  - Bài đăng: `Ngày` trong `[from, to]`, cộng một lần đọc theo `viecId` của các việc tồn đọng ngoài khoảng.
- Đọc các bảng song song (`Promise.all`), mỗi trang 200 bản ghi.
- Bỏ bản ghi trống toàn bộ, như Code.gs.
- Bản ghi tạo tay trong Lark không có cột `id`: dùng record_id làm `id` khi đọc (không ghi ngược vào Lark). Lần lưu sau sẽ ghi `id` này vào cột, nên sửa trong app không sinh bản trùng.
- Trong lúc đọc, dựng sẵn bảng tra `id app → record_id` cho mỗi bảng.

### 5.4 Ghi (`batch`)
1. Gom ops theo type; type ngoài danh sách ghi được thì báo lỗi.
2. Gán `capNhat` = giờ hiện tại (VN, `YYYY-MM-DDTHH:mm:ss`) cho mọi bản lưu.
3. Mỗi bản lưu: id đã có record_id thì đưa vào nhóm sửa (`setRecords`), chưa có thì đưa vào nhóm thêm (`addRecords`). Cùng id xuất hiện nhiều lần trong một lô thì giữ bản cuối.
4. Thứ tự type: `chude → viec → bai → bangiao → thuvien → mau → macdinh`. Bài ghi sau việc để lấy được record_id của việc vừa tạo; sau khi thêm, record_id mới được nạp ngay vào bảng tra.
5. Trong mỗi type: sửa, rồi thêm, rồi xoá (`deleteRecords`). Gửi theo nhóm 100 bản ghi.
6. Bảng tra lấy từ lần đọc gần nhất. Nếu không tìm thấy id, đọc lại riêng cột `id` của bảng đó trước khi kết luận là bản ghi mới, để tránh tạo bản trùng khi người khác vừa tạo.

Không còn khoá ghi `LockService`. Hai người sửa cùng bản ghi thì người lưu sau thắng, như hiện nay.

## 6. Nhận người dùng (`identity.js`)
1. Có lựa chọn tay "Tôi là" đã lưu thì dùng.
2. Không có thì lấy `bitable.bridge.getUserId()` và tìm trong Nhân sự (cột Người). Khớp thì dùng tên đó.
3. Không khớp (người mới; Hoa, Linh, Nam chưa có tài khoản Lark): hỏi "Bạn là ai?" một lần rồi nhớ.

Lựa chọn tay lưu trong `localStorage`. Mọi lần đọc/ghi `localStorage` đều bọc `try/catch`; hỏng thì app vẫn chạy, chỉ là phải chọn lại.

## 7. Cập nhật dữ liệu
- Nghe `onRecordAdd / onRecordModify / onRecordDelete` của các bảng; gộp sự kiện trong 1 giây rồi gọi lại `range` với khoảng ngày đang xem.
- Vẫn tải lại mỗi 60 giây để dự phòng, như bản cũ.
- Bỏ qua sự kiện trong 2 giây sau khi chính mình ghi.
- Đang mở form hoặc đang kéo thả thì hoãn tải lại tới khi đóng.

## 8. Xử lý lỗi

| Tình huống | Cách xử lý |
|---|---|
| Mở link ngoài Lark (SDK không kết nối được) | Hiện "Hãy mở trong Lark Base", không vẽ app |
| Không có quyền sửa Base (`base.getPermission`) | Nhãn "👁 Chỉ xem" trên đầu trang; mọi thao tác lưu bị chặn kèm thông báo vì sao (không ẩn từng nút) |
| Đọc lỗi | Giữ dữ liệu cũ trên màn hình, hiện lỗi kèm nút "Thử lại" |
| Ghi lỗi | Màn hình vẫn cập nhật ngay như cũ; nếu Lark báo lỗi thì hiện thông báo đỏ nêu rõ lỗi rồi tải lại từ Lark để về đúng dữ liệu thật |
| Lô bị ghi dở (nhóm đầu được, nhóm sau lỗi) | Như ghi lỗi: báo lỗi và tải lại; người dùng thấy đúng phần đã vào Lark |

Mọi lỗi đều ghi `console.error` kèm ngữ cảnh (thao tác, type, số bản ghi). Không có `catch` rỗng.

## 9. Bỏ phần dính Google trong Index.html
- `gasCall` / `google.script.run`, đường gọi `fetch` tới Web App, kho Demo `localStorage`.
- Trong tab Cài đặt: ô URL, nút ping, khung demo, hướng dẫn tạo Sheet, `pushseed`.
- Nhãn "Google Sheet" (`Index.html:726`), chữ "Data_PhanTich".
- Code chết: `poolFor` (`:629`), handler `hall` / `hbo` (`:1889-1890`).

Phần còn lại của Cài đặt (Nhân sự, Thư viện, Mẫu, Phân công mặc định, "Tôi là") giữ nguyên.

## 10. Chỗ đặt app
- **Chính:** extension thanh bên của Base (Extensions → Custom → URL GitHub Pages), ghim cho team. Cây rộng thì kéo panel to ra; cây vẫn cuộn ngang như cũ.
- **Thử thêm:** khối dashboard "Add custom" để có cả màn hình. Được thì thay khối Embeds trong dashboard "Cây kế hoạch"; không được thì chỉ dùng thanh bên.
- Kiểm tra lại các chỗ dễ vỡ trong iframe: link `target=_blank`, chép clipboard, menu `position:fixed`.

## 11. Deploy
- GitHub Pages từ nhánh `main`, thư mục gốc, không build. Người dùng push, khoảng 1 phút sau có bản mới.
- Repo public an toàn: không có khoá hay bí mật; quyền đọc/ghi đi theo phiên Lark của người mở; mở ngoài Lark không thấy dữ liệu.
- Hai extension:
  - "Plan CP·MKT (dev)" trỏ `http://127.0.0.1:<port>/index.html` (server tĩnh trên máy), gắn vào Base test.
  - "Plan CP·MKT" trỏ URL GitHub Pages, gắn vào Base chính.

## 12. Test
- **Tự động** (`node --test`, Node có sẵn):
  - `mapper`: đủ các kiểu ở 5.2, nhất là ngày quanh nửa đêm giờ VN, chuỗi rỗng, số có dấu phẩy, lựa chọn mới.
  - `domain`: ngày làm việc qua 05:00, giờ ca Sáng/Tối, quá giờ, dán mẫu.
  - `store` với SDK giả: thứ tự ghi, chia nhóm 100, giữ bản cuối khi trùng id, bài nhận record_id của việc vừa tạo, đọc lại id trước khi tạo mới, gộp `tonDong`.
  - Dữ liệu mẫu chụp từ Base thật (giá trị gốc qua SDK).
- **Trên Lark thật** bằng Chrome, trên Base test, từng tab:
  - Cây tổng thể: xem theo ngày/ca, tạo/sửa/xoá chủ đề và việc, dán mẫu, đổi trạng thái, dời ngày, bàn giao.
  - Việc của tôi: tự nhận người dùng, đổi tay "Tôi là", nhập bài đăng và số liệu.
  - Tiến độ: số liệu khớp dữ liệu.
  - Cài đặt: sửa Nhân sự, Thư viện, Mẫu, Phân công mặc định.
  - Lỗi: tài khoản chỉ xem; cố ý làm ghi lỗi để thấy thông báo và tải lại.
  - Đối chiếu một ngày với bản Apps Script: cây giống nhau.

## 13. Rủi ro cần thử sớm
1. **Lọc theo cột ngày bằng SDK**: cú pháp `filter` cho cột ngày (so mốc thời gian) chưa thử. Không được thì lọc qua view, hoặc đọc hết bảng rồi lọc trên máy, chấp nhận chậm hơn.
2. **Giới hạn số bản ghi mỗi lần ghi của SDK** (có lỗi `SingleRecordOperationLimitExceededError`): bắt đầu với nhóm 100, chỉnh theo thực tế.
3. **Khối dashboard "Add custom"** có nhận URL tự host không.
4. **Kích thước panel thanh bên** với cây rất rộng.
