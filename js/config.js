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
