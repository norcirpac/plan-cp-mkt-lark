/* =====================================================================
   TRẠNG THÁI
   ===================================================================== */
const bkey = m => m.mang + '|' + m.khoi;
const isDailyBlock = (mang, khoi) => (mang === 'Social' && SOCIAL_NHOM.includes(khoi)) || /hằng ngày/i.test(khoi);
const S = { tab: 'cay', date: workday(), ca: curCa(), td: 'ca', loaded: '', loading: false, err: '', tdMore: false,
  open: new Set(), linkOpen: new Set(), fold: new Set(ls.get(FOLD_KEY) || []),
  nhanSu: [], danhMuc: { kenh: [], dangBai: [], lyDo: [] }, macDinh: [], thuVien: [], mau: [], chuDe: [], viec: [], bai: [], banGiao: [], tonDong: [], tonDongBai: [] };
function needRange(){ return (S.tab === 'tiendo' && S.td === 'tuan') ? weekOf(S.date) : { from: S.date, to: S.date }; }
// Bỏ kết quả tải đã cũ: lần tải sau thắng; có lần lưu trong lúc đang tải thì tải lại sau, khỏi đè thay đổi vừa lưu
let LOAD_SEQ = 0, WRITE_SEQ = 0, WRITING = 0;
const STALE_RELOAD_MS = 3000;
function scheduleReload(){ setTimeout(() => load(true), STALE_RELOAD_MS); }
async function load(silent){
  const r = needRange(); const key = r.from + '_' + r.to;
  const seq = ++LOAD_SEQ, writeSeq = WRITE_SEQ;
  if (!silent) { S.loading = true; render(); }
  try {
    const d = await apiRange(r.from, r.to);
    if (seq !== LOAD_SEQ) return;
    if (WRITE_SEQ !== writeSeq || WRITING || (silent && !canAutoRefresh())) { scheduleReload(); return; }
    normKenh(d);
    Object.assign(S, d); S.loaded = key; S.err = '';
    const ids = new Set(S.bai.map(b => b.id)); (d.tonDongBai || []).forEach(b => { if (!ids.has(b.id)) S.bai.push(b); });
  } catch (e) { if (seq !== LOAD_SEQ) return; console.error('Tải dữ liệu Lark lỗi', { from: r.from, to: r.to, error: e }); S.err = e.message; toast('Không tải được dữ liệu: ' + e.message, true, 'Thử lại', () => load()); }
  S.loading = false; render();
}
function normKenh(d){
  const fx = (arr, f) => (arr || []).forEach(x => { if (x[f]) x[f] = mapKenh(x[f]); });
  fx(d.chuDe, 'kenhCan'); fx(d.viec, 'kenh'); fx(d.tonDong, 'kenh'); fx(d.bai, 'kenh'); fx(d.tonDongBai, 'kenh'); fx(d.thuVien, 'kenh'); fx(d.mau, 'kenhCan');
  (d.mau || []).forEach(m => { const vs = jparse(m.viecJson); if (vs.some(v => v.kenh && mapKenh(v.kenh) !== v.kenh)) m.viecJson = JSON.stringify(vs.map(v => Object.assign(v, { kenh: mapKenh(v.kenh) }))); });
  if (d.danhMuc && d.danhMuc.kenh) d.danhMuc.kenh = [...new Set(d.danhMuc.kenh.map(k => KENH_MAP[k] || k))];
}
function ensureLoaded(){ const r = needRange(); if (S.loaded !== r.from + '_' + r.to) load(); else render(); }
function applyLocal(ops){
  ops.forEach(op => { const k = KEYS[op.type]; const a = S[k];
    if (op.op === 'del') { S[k] = a.filter(x => x.id !== op.id); if (op.type === 'viec') S.tonDong = S.tonDong.filter(x => x.id !== op.id); return; }
    const i = a.findIndex(x => x.id === op.obj.id); if (i > -1) a[i] = op.obj; else a.push(op.obj);
    if (op.type === 'viec') { S.tonDong = S.tonDong.filter(x => x.id !== op.obj.id); if (op.obj.trangThai === 'Trì hoãn') S.tonDong.push(op.obj); }
  });
}
// Chế độ chỉ xem: render lại để ô vừa gõ trở về giá trị thật, rồi báo lý do
function canWrite(){
  if (!APP_ENV.readOnly) return true;
  render(); toast('Bạn chỉ có quyền xem Base này nên không lưu được. Nhờ người quản lý Base cấp quyền sửa.', true);
  return false;
}
async function commit(ops, msg){
  if (!ops.length) { if (msg) toast(msg); return true; }
  if (!canWrite()) return false;
  WRITE_SEQ++; WRITING++;
  applyLocal(ops); render();
  try { await apiBatch(ops); if (msg) toast(msg); return true; }
  catch (e) {
    console.error('Lưu lên Lark lỗi', { ops: ops.length, error: e });
    toast('Lưu lỗi: ' + e.message + ' · đang tải lại dữ liệu thật', true);
    load(true);
    return false;
  }
  finally { WRITING--; }
}
const sv = (type, obj) => ({ op: 'save', type, obj });
const dl = (type, id) => ({ op: 'del', type, id });

/* ---------- truy vấn ---------- */
const names = () => S.nhanSu.map(n => n.ten);
const cdsOf = (ngay, ca) => S.chuDe.filter(c => c.ngay === ngay && c.ca === ca).sort((a, b) => ordKey(a) - ordKey(b));
const cdById = id => S.chuDe.find(c => c.id === id);
const vById = id => S.viec.find(v => v.id === id) || S.tonDong.find(v => v.id === id);
const slotTasks = () => S.viec.filter(v => v.ngay === S.date && v.ca === S.ca);
const isLive = v => !['Bỏ','Đã chuyển'].includes(v.trangThai);
const postsOf = id => S.bai.filter(b => b.viecId === id).sort((a, b) => num(a.stt) - num(b.stt));
const isDoneP = b => !!(b && (b.link || b.khongLink === '1'));
const linksOf = id => S.bai.filter(b => b.viecId === id && isDoneP(b)).length;
const bInfo = b => vById(b.viecId) || b;
const pcPeople = (md, ca, mang) => arr((md.find(x => x.ca === ca && x.mang === mang) || {}).nguoi);
// Bàn giao và phân công có thể được tạo tay trong Lark (id = record_id): luôn dùng lại id của bản ghi đang có
const banGiaoOf = (ngay, ca, mang) => S.banGiao.find(x => x.ngay === ngay && x.ca === ca && x.mang === mang);
const macDinhOp = (ca, mang, nguoi) => sv('macdinh', { id: (S.macDinh.find(x => x.ca === ca && x.mang === mang) || {}).id || ca + '|' + mang, ca, mang, nguoi });
function pcol(n){ const i = names().indexOf(n); return i < 0 ? '#64748B' : PCOL[i % PCOL.length]; }
const pc = n => n ? `<span class="pc" style="--pc:${pcol(n)}">${esc(n)}</span>` : `<span class="pc none">Chưa có người</span>`;
function groupsOfCd(cdId){
  const m = new Map();
  S.viec.filter(v => v.chuDeId === cdId).forEach(v => { const k = gkey(v); if (!m.has(k)) m.set(k, []); m.get(k).push(v); });
  const gs = [...m.values()];
  gs.forEach(g => g.sort((a, b) => names().indexOf(a.nguoi) - names().indexOf(b.nguoi)));
  return gs.sort((a, b) => ordKey(a[0]) - ordKey(b[0]) || span(a[0])[0] - span(b[0])[0] || (a[0].caCa === '1') - (b[0].caCa === '1'));
}
function isLate(v){ if (!['Chưa làm','Đang làm'].includes(v.trangThai)) return false; const t = workday(); return v.ngay < t || (v.ngay === t && nowRel() > span(v)[1]); }
const timeBadge = v => { const full = (v.caCa === '1' || !v.batDau) && !v.gap; return `<span class="tb ${v.gap ? 'gap' : isLate(v) ? 'late' : full ? 'full' : ''}">${v.gap ? '⚡ ' : ''}${esc(timeLb(v))}</span>`; };
function stOf(v){
  if (v.trangThai === 'Bỏ') return 'bo';
  if (v.trangThai === 'Đã chuyển') return 'chuyen';
  if (v.trangThai === 'Trì hoãn') return 'tre';
  if (v.trangThai === 'Xong') return 'xong';
  if (v.trangThai === 'Đang làm') return 'dang';
  if (isLate(v)) return 'quagio';
  if (sl(v) >= 2 && postsOf(v.id).some(b => isDoneP(b) || b.idea)) return 'dang';
  return 'chua';
}

function autoStatus(v, posts){
  if (!['Chưa làm','Đang làm','Xong'].includes(v.trangThai)) return v.trangThai;
  const n = sl(v); if (n === 0) return v.trangThai;
  if (posts.filter(isDoneP).length >= n) return 'Xong';
  return v.trangThai === 'Xong' ? 'Chưa làm' : v.trangThai;
}

function nhomsOf(m, cds){
  const s = m === 'Social' ? SOCIAL_NHOM.slice() : ['Hằng ngày'];
  cds.filter(c => c.mang === m).forEach(c => { const g = c.nhom || defNhom(m); if (!s.includes(g)) s.push(g); });
  return s;
}
function nhomOptions(m){
  if (!NHOM_MANG[m]) return [];
  const s = m === 'Social' ? SOCIAL_NHOM.slice() : ['Hằng ngày'];
  S.mau.filter(x => x.mang === m).forEach(x => { if (x.nhom && !s.includes(x.nhom)) s.push(x.nhom); });
  S.chuDe.filter(c => c.mang === m).forEach(c => { if (c.nhom && !s.includes(c.nhom)) s.push(c.nhom); });
  return s;
}
const cdNhom = c => NHOM_MANG[c.mang] ? (c.nhom || defNhom(c.mang)) : '';
function myMangs(me){
  const s = MANG.filter(m => pcPeople(S.macDinh, S.ca, m).includes(me));
  slotTasks().filter(v => v.nguoi === me).forEach(v => { if (!s.includes(v.mang)) s.push(v.mang); });
  return s;
}
function newTask(o){
  const cd = o.cd || {};
  return { id: uid('v'), ngay: o.ngay, ca: o.ca, chuDeId: cd.id || '', mang: cd.mang || o.mang || '', nhom: cd.nhom || '', chuDeTen: cd.chuDe || '', nhomViec: o.nhomViec || uid('g'),
    nguoi: o.nguoi || '', viec: o.viec || '', caCa: o.caCa || '', batDau: o.batDau || '', ketThuc: o.ketThuc || '', kenh: o.kenh || '', dangBai: o.dangBai || '',
    soLuong: (o.soLuong == null || o.soLuong === '') ? '1' : String(o.soLuong), goiY: '', gap: o.gap || '', trangThai: o.trangThai || 'Chưa làm', lyDo: o.lyDo || '', doiNgay: o.doiNgay || '', doiCa: o.doiCa || '',
    goc: o.goc || '', lichSu: o.lichSu || '', ghiChu: o.ghiChu || '', thuTu: o.thuTu == null ? '' : String(o.thuTu) };
}
function fitShift(ca, caCa, bd, kt){
  const w = CA[ca]; const st = mins(bd);
  const out = !caCa && st != null && (st < w.s || st >= w.e);
  return out ? { caCa: '1', batDau: '', ketThuc: '' } : { caCa: caCa || '', batDau: caCa ? '' : (bd || ''), ketThuc: caCa ? '' : (kt || '') };
}

/* ---------- thư viện chọn nhanh ---------- */
function libItems(){
  const out = [];
  S.mau.slice().sort((a, b) => num(a.thuTu) - num(b.thuTu)).forEach(m => {
    out.push({ kind: 'cd', src: 'mau', ref: 'mc:' + m.id, mang: m.mang, nhom: m.nhom, ten: m.chuDe, cd: '', khoi: m.khoi, kenh: m.kenhCan });
    jparse(m.viecJson).forEach((v, i) => out.push({ kind: 'v', src: 'mau', ref: 'mv:' + m.id + ':' + i, mang: m.mang, ten: v.viec, cd: m.chuDe, khoi: m.khoi, data: v }));
  });
  S.thuVien.forEach(t => out.push({ kind: t.loai === 'chude' ? 'cd' : 'v', src: 'tv', ref: 'tv:' + t.id, mang: t.mang, nhom: t.nhom, ten: t.ten, cd: t.chuDeTen, kenh: t.kenh, data: t }));
  return out;
}
function libViec(mang, cdName){ const m = new Map(); libItems().filter(x => x.kind === 'v' && x.mang === mang && x.cd === cdName).forEach(x => { if (!m.has(x.ten)) m.set(x.ten, x); }); return [...m.values()]; }
function libCd(mang){ const m = new Map(); libItems().filter(x => x.kind === 'cd' && x.mang === mang).forEach(x => { if (!m.has(x.ten)) m.set(x.ten, x); }); return [...m.values()]; }

/* ---------- dán mẫu & phân công ---------- */
function blockList(src){ const seen = []; (src || S.mau).slice().sort((a, b) => num(a.thuTu) - num(b.thuTu)).forEach(m => { if (!seen.find(x => x.key === bkey(m))) seen.push({ key: bkey(m), mang: m.mang, khoi: m.khoi, nhom: m.nhom }); }); return seen; }
function buildPaste(ctx, keys, ngay, ca){
  const cds = [], tasks = [];
  const existing = ctx.chuDe.filter(c => c.ngay === ngay && c.ca === ca);
  let order = existing.reduce((mx, c) => Math.max(mx, num(c.thuTu)), 0) + 1;
  ctx.mau.filter(m => keys.includes(bkey(m))).sort((a, b) => num(a.thuTu) - num(b.thuTu)).forEach(m => {
    if (existing.some(c => c.mang === m.mang && c.chuDe === m.chuDe) || cds.some(c => c.mang === m.mang && c.chuDe === m.chuDe)) return;
    const P = pcPeople(ctx.macDinh, ca, m.mang); const who = P.length === 1 ? P[0] : '';
    // Việc có giờ thuộc ca khác (vd 17:50 khi dán vào ca sáng) thì không dán vào ca này
    const vs = jparse(m.viecJson).map((v, i) => Object.assign({}, v, { _i: i })).filter(v => { const st = mins(v.batDau); return v.caCa || st == null || (st >= CA[ca].s && st < CA[ca].e); });
    if (!vs.length && jparse(m.viecJson).length) return;
    const cd = { id: uid('cd'), ngay, ca, mang: m.mang, nhom: NHOM_MANG[m.mang] ? (m.nhom || defNhom(m.mang)) : '', chuDe: m.chuDe, nguoi: who, kenhCan: m.kenhCan, ghiChu: m.ghiChu || '', thuTu: String(order++) };
    cds.push(cd);
    vs.forEach(v => { const i = v._i;
      const t = fitShift(ca, v.caCa, v.batDau, v.ketThuc);
      const n = String(v.soLuong) === '0' ? '0' : String(num(v.soLuong) || 1);
      tasks.push(newTask(Object.assign({ ngay, ca, cd, nguoi: who, viec: v.viec, kenh: v.kenh, dangBai: v.dangBai, soLuong: n, thuTu: i }, t)));
    });
  });
  return { cds, tasks };
}
function phanCongOps(ngay, ca){
  const ops = [];
  MANG.forEach(m => {
    const P = pcPeople(S.macDinh, ca, m); if (!P.length) return;
    cdsOf(ngay, ca).filter(c => c.mang === m).forEach(c => {
      const np = P.length === 1 ? P[0] : arr(c.nguoi).filter(x => P.includes(x)).join(', ');
      if (np !== arr(c.nguoi).join(', ')) ops.push(sv('chude', Object.assign({}, c, { nguoi: np })));
    });
    S.viec.filter(v => v.ngay === ngay && v.ca === ca && v.mang === m && v.trangThai === 'Chưa làm' && !v.gap).forEach(v => {
      if (P.length === 1) {
        if (v.nguoi === P[0]) return;
        const dupe = S.viec.some(x => x !== v && gkey(x) === gkey(v) && x.nguoi === P[0]);
        if (dupe) { if (!postsOf(v.id).length) ops.push(dl('viec', v.id)); }
        else ops.push(sv('viec', Object.assign({}, v, { nguoi: P[0] })));
      } else if (v.nguoi && !P.includes(v.nguoi)) ops.push(sv('viec', Object.assign({}, v, { nguoi: '' })));
    });
  });
  return ops;
}

