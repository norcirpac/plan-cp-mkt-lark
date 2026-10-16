/**
 * PLAN CP·MKT v9 — kho dữ liệu là Lark Base (thay Google Sheet). Index.html giữ nguyên như v8.
 *
 * Cài đặt (làm 1 lần trên bản sao project):
 * 1) Cài đặt dự án ⚙ → Thuộc tính tập lệnh → thêm LARK_APP_ID và LARK_APP_SECRET (app Lark có quyền Base).
 * 2) Chạy hàm 'checkLark' để cấp quyền gọi URL ngoài và kiểm tra kết nối.
 * 3) Triển khai → Ứng dụng web (Thực thi bằng: Tôi). Index.html không cần sửa.
 *
 * Mỗi bảng Lark có cột 'id' (khoá của app) nên app vẫn làm việc với id như trước;
 * cột người dùng Lark (Người) được điền thêm theo bảng "Nhân sự" để lọc/nhắc việc trong Lark.
 */
const TZ = 'Asia/Ho_Chi_Minh';
const LARK_DOMAIN = 'https://open.larksuite.com';
const LARK_APP_TOKEN = '<APP_TOKEN_BASE_CHINH>';
const LARK_PAGE_SIZE = 500;
const LARK_TOKEN_CACHE_KEY = 'lark_tenant_token';
const PEOPLE_CACHE_KEY = 'lark_people';
const PEOPLE_CACHE_SECONDS = 10 * 60;

// type app -> bảng Lark và danh sách [khoá app, tên cột Lark, kiểu]. Sinh từ map.json.
const T = {
  chude: { tableId: 'tblkUb78Iqz3A2rf', fields: [["chuDe", "Chủ đề", "text"], ["id", "id", "text"], ["ngay", "Ngày", "date"], ["ca", "Ca", "single"], ["mang", "Mảng", "single"], ["nhom", "Nhóm", "single"], ["nguoi", "Tên người (gốc)", "text"], ["nguoi", "Người", "user"], ["kenhCan", "Kênh cần", "multi"], ["ghiChu", "Ghi chú", "text"], ["thuTu", "Thứ tự", "num"], ["capNhat", "capNhat", "text"]] },
  viec: { tableId: 'tblPooM4nf4m0Op7', fields: [["viec", "Việc", "text"], ["id", "id", "text"], ["ngay", "Ngày", "date"], ["ca", "Ca", "single"], ["chuDeId", "chuDeId", "text"], ["mang", "Mảng", "single"], ["nhom", "Nhóm", "single"], ["chuDeTen", "Chủ đề", "text"], ["nhomViec", "nhomViec", "text"], ["nguoi", "Tên người (gốc)", "text"], ["nguoi", "Người", "user"], ["caCa", "Cả ca", "check"], ["batDau", "Giờ bắt đầu", "text"], ["ketThuc", "Giờ kết thúc", "text"], ["kenh", "Kênh", "multi"], ["dangBai", "Dạng bài", "multi"], ["soLuong", "Số bài dự kiến", "num"], ["goiY", "Gợi ý số bài", "num"], ["gap", "Việc gấp", "check"], ["trangThai", "Trạng thái", "single"], ["lyDo", "Lý do trì hoãn", "single"], ["doiNgay", "Dời sang ngày", "date"], ["doiCa", "Dời sang ca", "single"], ["goc", "goc", "text"], ["lichSu", "Lịch sử", "text"], ["ghiChu", "Ghi chú", "text"], ["thuTu", "Thứ tự", "num"], ["capNhat", "capNhat", "text"]] },
  bai: { tableId: 'tblFIiZCFfeQcIqJ', fields: [["idea", "Idea", "text"], ["id", "id", "text"], ["viecId", "viecId", "text"], ["viecId", "Việc", "link:viec"], ["stt", "stt", "num"], ["ngay", "Ngày", "date"], ["ca", "Ca", "single"], ["mang", "Mảng", "single"], ["chuDeTen", "Chủ đề", "text"], ["nguoi", "Tên người (gốc)", "text"], ["nguoi", "Người đăng", "user"], ["kenh", "Kênh", "single"], ["dangBai", "Dạng bài", "single"], ["link", "Link", "url"], ["khongLink", "Không có link", "check"], ["tgDang", "Thời điểm đăng", "datetime"], ["tiepCan", "Tiếp cận", "num"], ["thich", "Thích", "num"], ["binhLuan", "Bình luận", "num"], ["tgDien", "Thời điểm điền số liệu", "datetime"], ["capNhat", "capNhat", "text"]] },
  bangiao: { tableId: 'tblRkr8evi77Spwt', fields: [["ghiChu", "Ghi chú", "text"], ["id", "id", "text"], ["ngay", "Ngày", "date"], ["ca", "Ca", "single"], ["mang", "Mảng", "single"], ["capNhat", "capNhat", "text"]] },
  thuvien: { tableId: 'tbl5Hc0x1qvBHzJy', fields: [["ten", "Tên", "text"], ["id", "id", "text"], ["loai", "Loại", "single"], ["mang", "Mảng", "single"], ["nhom", "Nhóm", "single"], ["chuDeTen", "Chủ đề", "text"], ["kenh", "Kênh", "multi"], ["dangBai", "Dạng bài", "multi"], ["caCa", "Cả ca", "check"], ["batDau", "Giờ bắt đầu", "text"], ["ketThuc", "Giờ kết thúc", "text"], ["soLuong", "Số lượng", "num"], ["capNhat", "capNhat", "text"]] },
  mau: { tableId: 'tblfcxrCT997izD1', fields: [["chuDe", "Chủ đề", "text"], ["id", "id", "text"], ["khoi", "Khối", "single"], ["mang", "Mảng", "single"], ["nhom", "Nhóm", "single"], ["thuTu", "Thứ tự", "num"], ["kenhCan", "Kênh cần", "multi"], ["ghiChu", "Ghi chú", "text"], ["viecJson", "Danh sách việc (JSON)", "text"], ["capNhat", "capNhat", "text"]] },
  macdinh: { tableId: 'tblPCFJKdVsZLZnn', fields: [["id", "Ca | Mảng", "text"], ["ca", "Ca", "single"], ["mang", "Mảng", "multi"], ["nguoi", "Tên người (gốc)", "text"], ["nguoi", "Người", "user"], ["capNhat", "capNhat", "text"]] },
  nhansu: { tableId: 'tblOPRF9BK2UlnyF', fields: [["ten", "Tên", "text"], ["openId", "Người", "user"]] },
  danhmuc: { tableId: 'tblSY0mvn5pVtuEM', fields: [["kenh", "Kênh", "text"], ["dangBai", "Dạng bài", "text"], ["lyDo", "Lý do", "text"]] },
};
const WRITABLE = ['chude', 'viec', 'bai', 'bangiao', 'thuvien', 'mau', 'macdinh'];

/* ---------- HTTP ---------- */
function doGet(e) {
  const p = (e && e.parameter) || {};
  // Mở link không kèm action → hiện app
  // ALLOWALL: cho phép nhúng app vào dashboard Lark (extension Embeds)
  if (!p.action) {
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('Plan CP·MKT')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return route(p.action, p.from, p.to, p.ops ? JSON.parse(p.ops) : null);
}
// App chạy trên web gọi hàm này qua google.script.run
function api(req) {
  req = req || {};
  return JSON.stringify(handle(req.action, req.from, req.to, req.ops || null));
}
function doPost(e) {
  const b = JSON.parse(e.postData.contents || '{}');
  return route(b.action, b.from, b.to, b.ops || null);
}
function route(action, from, to, ops) { return out(handle(action, from, to, ops)); }
function handle(action, from, to, ops) {
  try {
    let data;
    if (action === 'ping') data = { ok: true, time: Utilities.formatDate(new Date(), TZ, 'HH:mm') };
    else if (action === 'range') data = getRange(from, to);
    else if (action === 'batch') data = batch(ops || []);
    else throw new Error('Thiếu action');
    return { ok: true, data: data };
  } catch (err) {
    console.error('handle failed', action, err && err.stack);
    return { ok: false, error: String(err && err.message || err) };
  }
}
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ---------- Lark API ---------- */
function larkToken_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(LARK_TOKEN_CACHE_KEY);
  if (cached) return cached;
  const props = PropertiesService.getScriptProperties();
  const appId = props.getProperty('LARK_APP_ID'), appSecret = props.getProperty('LARK_APP_SECRET');
  if (!appId || !appSecret) throw new Error('Chưa cấu hình LARK_APP_ID / LARK_APP_SECRET trong Thuộc tính tập lệnh');
  const res = JSON.parse(UrlFetchApp.fetch(LARK_DOMAIN + '/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  }).getContentText());
  if (res.code !== 0) throw new Error('Lark token lỗi ' + res.code + ': ' + res.msg);
  // Token sống ~2 giờ; trừ hao 5 phút để không dùng token sắp hết hạn
  cache.put(LARK_TOKEN_CACHE_KEY, res.tenant_access_token, Math.min(21600, res.expire - 300));
  return res.tenant_access_token;
}
function larkRequest_(method, path, body) {
  const req = {
    url: LARK_DOMAIN + '/open-apis/bitable/v1/apps/' + LARK_APP_TOKEN + path,
    method: method, contentType: 'application/json; charset=utf-8', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + larkToken_() },
  };
  if (body) req.payload = JSON.stringify(body);
  return req;
}
function larkParse_(response, label) {
  const res = JSON.parse(response.getContentText() || '{}');
  if (res.code !== 0) throw new Error('Lark ' + label + ' lỗi ' + res.code + ': ' + res.msg);
  return res.data || {};
}
function larkCall_(method, path, body) {
  const req = larkRequest_(method, path, body);
  return larkParse_(UrlFetchApp.fetch(req.url, req), path);
}
function searchPath_(tableId, pageToken) {
  return '/tables/' + tableId + '/records/search?page_size=' + LARK_PAGE_SIZE + (pageToken ? '&page_token=' + encodeURIComponent(pageToken) : '');
}
/** Đọc toàn bộ bản ghi của nhiều bảng; trang đầu của mọi bảng gọi song song bằng fetchAll. */
function listRecordsMany_(tableIds) {
  const result = {};
  let pending = tableIds.map(id => ({ id: id, token: '' }));
  tableIds.forEach(id => { result[id] = []; });
  while (pending.length) {
    const responses = UrlFetchApp.fetchAll(pending.map(p => larkRequest_('post', searchPath_(p.id, p.token), { automatic_fields: false })));
    pending = pending.map((p, i) => {
      const data = larkParse_(responses[i], 'đọc ' + p.id);
      result[p.id] = result[p.id].concat(data.items || []);
      return data.has_more ? { id: p.id, token: data.page_token } : null;
    }).filter(Boolean);
  }
  return result;
}
function larkBatch_(tableId, action, records) {
  for (let i = 0; i < records.length; i += LARK_PAGE_SIZE) {
    larkCall_('post', '/tables/' + tableId + '/records/' + action, { records: records.slice(i, i + LARK_PAGE_SIZE) });
  }
}

/* ---------- Chuyển đổi giá trị ---------- */
function textOf_(v) {
  if (Array.isArray(v)) return v.map(x => (x && typeof x === 'object') ? (x.text || '') : String(x)).join('');
  return v === null || v === undefined ? '' : String(v);
}
function splitList_(s) { return String(s || '').split(',').map(x => x.trim()).filter(Boolean); }
function vnMs_(s, withTime) {
  const text = String(s || '').trim().replace('T', ' ');
  if (!text) return null;
  const m = /^(\d{4}-\d{2}-\d{2})(?: (\d{2}:\d{2}))?/.exec(text);
  if (!m) return null;
  return new Date(m[1] + 'T' + (withTime && m[2] ? m[2] : '00:00') + ':00+07:00').getTime();
}
function fromLark_(kind, v) {
  if (kind === 'check') return v ? '1' : '';
  if (v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length)) return '';
  switch (kind) {
    case 'text': case 'single': return textOf_(v);
    case 'num': return String(Number(v));
    case 'multi': return v.join(', ');
    case 'date': return Utilities.formatDate(new Date(v), TZ, 'yyyy-MM-dd');
    case 'datetime': return Utilities.formatDate(new Date(v), TZ, 'yyyy-MM-dd HH:mm');
    case 'url': return typeof v === 'object' ? (v.link || '') : String(v);
    default: return '';
  }
}
function toLark_(kind, value, ctx) {
  if (kind === 'check') return ['', '0', 'false', 'FALSE'].indexOf(String(value === undefined || value === null ? '' : value)) < 0;
  const s = value === null || value === undefined ? '' : String(value).trim();
  if (s === '') return null;
  switch (kind) {
    case 'text': case 'single': return s;
    case 'num': { const n = Number(s.replace(',', '.')); return isNaN(n) ? null : n; }
    case 'multi': return splitList_(s);
    case 'date': return vnMs_(s, false);
    case 'datetime': return vnMs_(s, true);
    case 'url': return { link: s, text: s };
    case 'user': {
      const ids = splitList_(s).map(name => ctx.people()[name]).filter(Boolean);
      return ids.length ? ids.map(id => ({ id: id })) : null;
    }
    default:
      if (kind.indexOf('link:') === 0) { const rid = ctx.recordId(kind.slice(5), s); return rid ? [rid] : null; }
      return null;
  }
}
function headOf_(type) {
  const seen = {};
  return T[type].fields.map(f => f[0]).filter(k => (seen[k] ? false : (seen[k] = true)));
}
function readableFields_(type) {
  return T[type].fields.filter(f => f[2] !== 'user' && f[2].indexOf('link:') !== 0);
}
function idFieldName_(type) {
  const f = T[type].fields.find(x => x[0] === 'id');
  return f ? f[1] : null;
}

/* ---------- Đọc ---------- */
function recordToObj_(type, rec) {
  const o = {};
  headOf_(type).forEach(k => { o[k] = ''; });
  readableFields_(type).forEach(f => { o[f[0]] = fromLark_(f[2], rec.fields[f[1]]); });
  return o;
}
function readMany_(types) {
  const raw = listRecordsMany_(types.map(t => T[t].tableId));
  const out = {};
  types.forEach(t => {
    out[t] = raw[T[t].tableId]
      .map(rec => recordToObj_(t, rec))
      .filter(o => Object.keys(o).some(k => o[k] !== ''));
  });
  return out;
}
function getRange(from, to) {
  const inR = x => x.ngay >= from && x.ngay <= to;
  const all = readMany_(['nhansu', 'danhmuc', 'macdinh', 'thuvien', 'mau', 'chude', 'viec', 'bai', 'bangiao']);
  const dm = all.danhmuc;
  const tonDong = all.viec.filter(v => v.trangThai === 'Trì hoãn');
  const tdIds = {}; tonDong.forEach(v => { tdIds[v.id] = 1; });
  return {
    nhanSu: all.nhansu.filter(x => x.ten).map(x => ({ ten: x.ten })),
    danhMuc: { kenh: dm.map(x => x.kenh).filter(Boolean), dangBai: dm.map(x => x.dangBai).filter(Boolean), lyDo: dm.map(x => x.lyDo).filter(Boolean) },
    macDinh: all.macdinh,
    thuVien: all.thuvien,
    mau: all.mau,
    chuDe: all.chude.filter(inR),
    viec: all.viec.filter(inR),
    bai: all.bai.filter(inR),
    banGiao: all.bangiao.filter(inR),
    tonDong: tonDong,
    tonDongBai: all.bai.filter(b => tdIds[b.viecId] && !inR(b)),
  };
}

/* ---------- Ghi ---------- */
function makeContext_() {
  const memo = {};
  return {
    people: () => {
      if (memo.people) return memo.people;
      const cache = CacheService.getScriptCache();
      const cached = cache.get(PEOPLE_CACHE_KEY);
      if (cached) return (memo.people = JSON.parse(cached));
      const map = {};
      listRecordsMany_([T.nhansu.tableId])[T.nhansu.tableId].forEach(rec => {
        const name = textOf_(rec.fields['Tên']), users = rec.fields['Người'] || [];
        if (name && users.length) map[name] = users[0].id;
      });
      cache.put(PEOPLE_CACHE_KEY, JSON.stringify(map), PEOPLE_CACHE_SECONDS);
      return (memo.people = map);
    },
    recordId: (type, appId) => {
      if (!memo[type]) memo[type] = idIndex_(type);
      return memo[type][appId];
    },
  };
}
/** app id -> record_id của Lark cho một bảng */
function idIndex_(type) {
  const idField = idFieldName_(type), index = {};
  listRecordsMany_([T[type].tableId])[T[type].tableId].forEach(rec => {
    const key = textOf_(rec.fields[idField]);
    if (key) index[key] = rec.record_id;
  });
  return index;
}
function batch(ops) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const now = Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ss");
    const ctx = makeContext_();
    const byType = {};
    ops.forEach(op => { if (WRITABLE.indexOf(op.type) < 0) throw new Error('Không ghi được ' + op.type); (byType[op.type] = byType[op.type] || []).push(op); });
    let n = 0;
    Object.keys(byType).forEach(type => {
      const tableId = T[type].tableId;
      const index = idIndex_(type);
      const creates = {}, updates = {}, dels = [];
      byType[type].forEach(op => {
        if (op.op === 'del') {
          const rid = index[String(op.id)];
          if (rid && dels.indexOf(rid) < 0) { dels.push(rid); delete updates[rid]; n++; }
          return;
        }
        const obj = op.obj; obj.capNhat = now;
        const fields = {};
        T[type].fields.forEach(f => { fields[f[1]] = toLark_(f[2], obj[f[0]], ctx); });
        const rid = index[String(obj.id)];
        if (rid) updates[rid] = { record_id: rid, fields: fields };
        else {
          // Cùng id xuất hiện nhiều lần trong một batch → giữ bản cuối như bản Sheet
          const clean = {}; Object.keys(fields).forEach(k => { if (fields[k] !== null) clean[k] = fields[k]; });
          creates[String(obj.id)] = { fields: clean };
        }
        n++;
      });
      const updateList = Object.keys(updates).map(k => updates[k]), createList = Object.keys(creates).map(k => creates[k]);
      if (updateList.length) larkBatch_(tableId, 'batch_update', updateList);
      if (createList.length) larkBatch_(tableId, 'batch_create', createList);
      if (dels.length) larkCall_('post', '/tables/' + tableId + '/records/batch_delete', { records: dels });
    });
    return { done: n };
  } finally { lock.releaseLock(); }
}

/* ---------- Kiểm tra ---------- */
/** Chạy tay trong editor: cấp quyền + kiểm tra đọc được Base. */
function checkLark() {
  const all = readMany_(Object.keys(T));
  const summary = Object.keys(all).map(t => t + '=' + all[t].length).join(', ');
  console.log('Lark OK: ' + summary);
  return summary;
}
