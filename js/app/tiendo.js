/* =====================================================================
   TẦNG 3 – TIẾN ĐỘ
   ===================================================================== */
function scope(){
  if (S.td === 'ca') return { vs: slotTasks(), bs: S.bai.filter(b => b.ngay === S.date && b.ca === S.ca) };
  if (S.td === 'ngay') return { vs: S.viec.filter(v => v.ngay === S.date), bs: S.bai.filter(b => b.ngay === S.date) };
  const w = weekOf(S.date); const inW = x => x.ngay >= w.from && x.ngay <= w.to;
  return { vs: S.viec.filter(inW), bs: S.bai.filter(inW) };
}
function renderTienDo(){
  const w = weekOf(S.date);
  let h = `<div class="bar"><span class="pill lt">${[['ca', CA[S.ca].lb + ' · ' + fmtD(S.date)], ['ngay', 'Cả ngày ' + fmtD(S.date)], ['tuan', 'Tuần ' + fmtD(w.from) + ' – ' + fmtD(w.to)]].map(([k, lb]) => `<button class="btn ${S.td === k ? 'pri' : ''}" data-act="td" data-v="${k}" style="border:0">${esc(lb)}</button>`).join('')}</span><span class="hint" style="margin-left:auto">Tự làm mới mỗi phút</span></div>`;
  const { vs, bs } = scope();
  const live = vs.filter(isLive);
  h += missSection(live, bs);
  const c = k => live.filter(v => stOf(v) === k).length;
  const posted = bs.filter(isDoneP).length, tgt = live.reduce((s, v) => s + sl(v), 0);
  const cmt = bs.reduce((s, b) => s + num(b.binhLuan), 0), reach = bs.reduce((s, b) => s + num(b.tiepCan), 0);
  h += `<div class="kpis">
    <div class="kpi"><b>${live.length}</b><span>tổng việc</span></div>
    <div class="kpi"><b style="color:var(--xong)">${c('xong')}</b><span>✅ xong · ${live.length ? Math.round(c('xong') / live.length * 100) : 0}%</span></div>
    <div class="kpi"><b style="color:var(--dang)">${c('dang')}</b><span>🟡 đang làm</span></div>
    <div class="kpi"><b style="color:var(--quagio)">${c('quagio')}</b><span>🔴 quá giờ</span></div>
    <div class="kpi"><b style="color:var(--tre)">${c('tre')}</b><span>⏸ trì hoãn</span></div>
    <div class="kpi"><b>${posted}/${tgt}</b><span>bài đăng / dự kiến</span></div>
    <div class="kpi"><b>${cmt.toLocaleString('vi-VN')}</b><span>💬 bình luận · 👁 ${reach.toLocaleString('vi-VN')}</span></div></div>`;
  if (S.td === 'tuan') return h + renderWeek(vs, bs, w);
  const isNow = S.date === workday() && (S.td === 'ngay' || S.ca === curCa());
  if (isNow) h += `<div class="card sec"><h3>👀 Ngay lúc này</h3>${nowGrid(live)}</div>`;
  h += `<div class="card sec"><h3>🗓️ Dòng thời gian theo người</h3>${gantt(live)}</div>`;
  h += `<div class="card sec"><h3>🧩 Theo mảng</h3><div class="mcards">${MANG.map(m => {
    const mv = live.filter(v => v.mang === m), mb = bs.filter(b => b.mang === m);
    return `<div class="mcard" style="${mcStyle(m)}"><b>${esc(m)}</b><div class="r"><span>Việc xong</span><b>${mv.filter(v => v.trangThai === 'Xong').length}/${mv.length}</b></div><div class="r"><span>Bài / dự kiến</span><b>${mb.filter(isDoneP).length}/${mv.reduce((s, v) => s + sl(v), 0)}</b></div><div class="r"><span>💬 Bình luận</span><b>${mb.reduce((s, b) => s + num(b.binhLuan), 0)}</b></div><div class="r"><span>👁 Tiếp cận</span><b>${mb.reduce((s, b) => s + num(b.tiepCan), 0).toLocaleString('vi-VN')}</b></div></div>`; }).join('')}</div></div>`;
  h += `<div class="card sec"><h3>⏸ Việc trì hoãn tồn đọng (${S.tonDong.length})</h3>${tonDongTable()}</div>`;
  if (S.td === 'ca') h += handoverSection(live, bs);
  else h += `<div class="card sec"><h3>🏆 Top bài tương tác tốt nhất</h3>${topPosts(bs, 8)}</div>`;
  return h;
}
/* ---------- 📋 Ai còn thiếu cập nhật ---------- */
// Hạn của 1 việc: việc theo giờ = giờ kết thúc; việc cả ca = 30 phút trước khi hết ca
const dueMin = v => (v.caCa === '1' || !v.batDau) ? (CA[v.ca] || CA['Sáng']).e - 30 : span(v)[1];
const slotDue = (ngay, ca) => { const t = workday(); return ngay < t || (ngay === t && nowRel() >= (CA[ca] || CA['Sáng']).e - 30); };
const isDue = v => { const t = workday(); return v.ngay < t || (v.ngay === t && nowRel() >= dueMin(v)); };
const noMetric = b => b.link && !String(b.tiepCan || '').trim() && !String(b.thich || '').trim() && !String(b.binhLuan || '').trim();
function missData(live, bs){
  const tick = live.filter(v => v.nguoi && v.trangThai === 'Chưa làm' && !v.gap && isDue(v) && !postsOf(v.id).some(isDoneP));
  const so = bs.filter(b => noMetric(b) && slotDue(b.ngay, b.ca)).map(b => Object.assign({ _p: bInfo(b).nguoi || b.nguoi }, b)).filter(b => b._p);
  const dueAny = live.some(isDue) || bs.some(b => b.link && slotDue(b.ngay, b.ca));
  const people = [...new Set(live.map(v => v.nguoi).filter(Boolean))];
  const rows = people.map(p => ({ p, t: tick.filter(v => v.nguoi === p), s: so.filter(b => b._p === p) }))
    .sort((a, b) => (b.t.length + b.s.length) - (a.t.length + a.s.length) || names().indexOf(a.p) - names().indexOf(b.p));
  return { rows, dueAny, total: tick.length + so.length };
}
function missSection(live, bs){
  const d = missData(live, bs); window._miss = d;
  let body;
  if (!d.dueAny) body = '<div class="hint">Chưa có việc nào tới hạn cập nhật.</div>';
  else if (!d.total) body = '<div class="allok">✅ Cả team đã cập nhật đủ</div>';
  else body = `<div class="tbl"><table class="misst"><tr><th>Người</th><th>Chưa tick tình trạng</th><th>Chưa điền số liệu</th></tr>${d.rows.map(r => `<tr><td>${pc(r.p)}</td>
      <td>${r.t.length ? `<button class="mcell" data-act="misspop" data-p="${esc(r.p)}" data-k="t">🔴 ${r.t.length} việc</button>` : '<span class="okc">✓</span>'}</td>
      <td>${r.s.length ? `<button class="mcell" data-act="misspop" data-p="${esc(r.p)}" data-k="s">🔴 ${r.s.length} bài</button>` : '<span class="okc">✓</span>'}</td></tr>`).join('')}</table></div>`;
  return `<div class="card sec"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><h3 style="margin:0">📋 Ai còn thiếu cập nhật</h3>${d.total ? '<button class="btn sm" data-act="misscopy" style="margin-left:auto">📋 Copy nhắc nhở</button>' : ''}</div>
    <div class="hint" style="margin:4px 0 8px">Chưa tick: việc đã qua giờ kết thúc (việc cả ca: 30 phút trước hết ca) mà chưa bấm gì. Chưa điền số liệu: bài có link nhưng chưa điền tiếp cận, thích, bình luận (tính từ 30 phút trước hết ca). Bấm ô đỏ để xem chi tiết.</div>${body}</div>`;
}
function missPopHtml(p, k){
  const r = (window._miss.rows || []).find(x => x.p === p); if (!r) return '';
  if (k === 't') return `<b>${esc(p)} · việc chưa tick tình trạng</b>` + r.t.sort((a, b) => dueMin(a) - dueMin(b)).map(v => `<div>${timeBadge(v)} ${esc(v.viec)} <span class="hint">· ${esc(v.mang)} · ${esc(v.chuDeTen)}${v.ngay !== S.date ? ' · ' + esc(fmtD(v.ngay)) : ''}${sl(v) ? ` · ${linksOf(v.id)}/${sl(v)} bài` : ''}</span></div>`).join('');
  return `<b>${esc(p)} · bài chưa điền số liệu</b>` + r.s.map(b => { const v = bInfo(b); return `<div>${esc(v.viec || '')} · Bài ${esc(b.stt)} <span class="hint">· ${esc(b.kenh)} · đăng ${esc(dtShow(b.tgDang, b.ngay))}</span> <a class="lnkbtn" href="${esc(b.link)}" target="_blank" rel="noopener">🔗 Mở bài</a></div>`; }).join('');
}
function missCopyText(){
  const d = window._miss; if (!d) return '';
  const lb = S.td === 'tuan' ? 'tuần ' + fmtD(weekOf(S.date).from) + ' – ' + fmtD(weekOf(S.date).to) : S.td === 'ngay' ? 'ngày ' + fmtD(S.date) : CA[S.ca].lb.toLowerCase() + ' ' + fmtD(S.date);
  const lines = d.rows.filter(r => r.t.length || r.s.length).map(r => {
    const parts = [];
    if (r.t.length) parts.push(`${r.t.length} việc chưa tick tình trạng (${r.t.map(v => v.viec).join('; ')})`);
    if (r.s.length) parts.push(`${r.s.length} bài chưa điền số liệu`);
    return `- ${r.p}: ${parts.join(', ')}`;
  });
  return `📋 Nhắc cập nhật plan ${lb}:\n${lines.join('\n')}\nMọi người vào app cập nhật giúp nhé!`;
}
function copyText(t){
  const done = () => toast('Đã copy, dán vào nhóm chat để nhắc');
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t).then(done).catch(() => fallbackCopy(t, done));
  fallbackCopy(t, done);
}
// Iframe extension của Lark chặn clipboard: execCommand trả về false chứ không ném lỗi, nên phải xét kết quả
function fallbackCopy(t, done){ const a = document.createElement('textarea'); a.value = t; a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); let ok = false; try { ok = document.execCommand('copy'); } catch(e) { console.warn('execCommand copy lỗi', e); } a.remove(); if (ok) return done(); manualCopy(t); }
function manualCopy(t){ openModal(`<h3>Copy tay giúp mình</h3><div class="hint">Lark không cho app ghi vào clipboard. Bấm vào ô dưới, Ctrl/Cmd+A rồi Ctrl/Cmd+C.</div><div class="f"><textarea id="copyBox" rows="8" readonly>${esc(t)}</textarea></div><div class="mfoot"><button class="btn" data-act="close">Đóng</button></div>`); const box = $('copyBox'); if (box && box.select) box.select(); }
function nowGrid(live){
  const people = [...new Set(live.map(v => v.nguoi).filter(Boolean))];
  if (!people.length) return '<div class="hint">Chưa có việc.</div>';
  const n = nowRel();
  return `<div class="now-grid">${people.map(p => {
    const ts = live.filter(v => v.nguoi === p).sort((a, b) => span(a)[0] - span(b)[0]);
    const doing = ts.filter(v => stOf(v) === 'dang'), qg = ts.filter(v => stOf(v) === 'quagio');
    const next = ts.find(v => stOf(v) === 'chua' && v.caCa !== '1' && v.batDau && span(v)[0] >= n - 30);
    let x = doing.map(v => `<div style="color:var(--dang)">🟡 ${esc(v.viec)} · ${linksOf(v.id)}/${sl(v)} bài</div>`).join('');
    if (next) x += `<div class="muted">Tiếp theo ${esc(next.batDau)}: ${esc(next.viec)}</div>`;
    if (!doing.length && !next) x += `<div class="muted">${ts.filter(v => v.trangThai === 'Xong').length}/${ts.length} việc xong</div>`;
    if (qg.length) x += `<div style="color:var(--quagio)">🔴 ${qg.length} việc quá giờ</div>`;
    return `<div class="now-card">${pc(p)}${x}</div>`; }).join('')}</div>`;
}
function gantt(live){
  const START = S.td === 'ngay' ? 480 : CA[S.ca].s - 30, END = S.td === 'ngay' ? 1500 : CA[S.ca].e + 30, SPAN = END - START;
  const x = m => Math.max(0, Math.min(100, (m - START) / SPAN * 100));
  let hours = '', grid = '';
  for (let m = Math.ceil(START / 60) * 60; m <= END; m += 60) { hours += `<span style="left:${x(m)}%">${p2((m / 60) % 24)}h</span>`; grid += `<i style="left:${x(m)}%"></i>`; }
  const people = [...new Set(live.map(v => v.nguoi).filter(Boolean))];
  if (!people.length) return '<div class="hint">Chưa có việc.</div>';
  const nowM = nowRel();
  let h = `<div class="gantt"><div class="g-inner"><div class="g-axis"><div></div><div class="g-hours">${hours}</div></div><div class="g-grid">${grid}${S.date === workday() && nowM >= START && nowM <= END ? `<div class="g-now" style="left:${x(nowM)}%"></div>` : ''}</div>`;
  people.forEach(p => {
    const ts = live.filter(v => v.nguoi === p);
    const timed = ts.filter(v => v.caCa !== '1' && v.batDau).sort((a, b) => span(a)[0] - span(b)[0]);
    const full = ts.filter(v => v.caCa === '1' || !v.batDau);
    let bars = '', top = 4;
    const cg = {}; full.forEach(v => (cg[v.ca] = cg[v.ca] || []).push(v));
    Object.keys(cg).forEach(ca => { const g = cg[ca]; const w = CA[ca]; const d = g.filter(v => v.trangThai === 'Xong').length;
      bars += `<div class="g-bar full" style="left:${x(w.s)}%;width:${x(w.e) - x(w.s)}%;top:${top}px" data-act="gpopfull" data-p="${esc(p)}" data-ca="${ca}">Cả ${CA[ca].lb.toLowerCase()}: ${g.length} việc · ${d} xong · bấm để xem</div>`; });
    if (Object.keys(cg).length) top += 20;
    const lanes = [];
    timed.forEach(v => { const [s, e0] = span(v); const e = Math.max(e0, s + 10);
      let ln = lanes.findIndex(end => end <= s); if (ln < 0) { ln = lanes.length; lanes.push(e); } else lanes[ln] = e;
      const k = stOf(v);
      bars += `<div class="g-bar s-${k}" style="left:${x(s)}%;width:${Math.max(.7, x(e) - x(s))}%;top:${top + ln * 24}px" data-act="gpop" data-id="${v.id}">${v.gap ? '⚡' : ''}${esc(v.viec)}</div>`; });
    const hgt = top + Math.max(lanes.length, Object.keys(cg).length ? 0 : 1) * 24 + 4;
    h += `<div class="g-row"><div class="g-name">${pc(p)}</div><div class="g-track" style="height:${hgt}px">${bars}</div></div>`;
  });
  return h + `</div></div><div class="hint" style="margin-top:6px">Bấm vào ô việc để xem nhanh nội dung. Thanh sọc = việc cả ca, bấm để xem danh sách.</div>`;
}
function tonDongTable(){
  if (!S.tonDong.length) return '<div class="hint">Không có việc trì hoãn 👍</div>';
  const rows = S.tonDong.slice().sort((a, b) => slotKey(a.ngay, a.ca).localeCompare(slotKey(b.ngay, b.ca)));
  const show = S.tdMore ? rows : rows.slice(0, 5);
  let h = `<div class="tbl"><table><tr><th>Từ</th><th>Mảng</th><th>Việc</th><th>Chủ đề</th><th>Người</th><th>Bài</th><th>Lý do</th><th>Dời sang</th><th></th></tr>${show.map(v => `<tr><td>${esc(fmtD(v.ngay))} · ${esc(v.ca)}</td><td><span class="mtag" style="${mcStyle(v.mang)}">${esc(v.mang)}</span></td><td><b>${esc(v.viec)}</b></td><td>${esc(v.chuDeTen)}</td><td>${pc(v.nguoi)}</td><td>${sl(v) ? linksOf(v.id) + '/' + sl(v) : '–'}</td><td>${esc(v.lyDo)}</td><td><b>${esc(fmtD(v.doiNgay || v.ngay))} · ${esc(v.doiCa || '')}</b></td><td><button class="btn sm danger" data-act="deltd" data-id="${v.id}" title="Xoá khỏi tồn đọng">🗑</button></td></tr>`).join('')}</table></div>`;
  if (rows.length > 5) h += `<button class="btn sm ghost" data-act="tdmore" style="margin-top:8px">${S.tdMore ? 'Thu gọn ▴' : `Xem thêm ${rows.length - 5} việc ▾`}</button>`;
  return h;
}
function delPending(id){
  const v = vById(id); if (!v || !canWrite()) return;
  const ps = postsOf(id), keep = ps.filter(isDoneP), drop = ps.filter(b => !isDoneP(b));
  const before = [{ type: 'viec', obj: v }, ...ps.map(b => ({ type: 'bai', obj: b }))];
  const ops = keep.length
    ? [sv('viec', Object.assign({}, v, { trangThai: 'Bỏ', soLuong: String(keep.length), lyDo: (v.lyDo || '') + ' · đã xoá khỏi tồn đọng' })), ...drop.map(b => dl('bai', b.id))]
    : [dl('viec', id), ...ps.map(b => dl('bai', b.id))];
  commit(ops);
  toast(keep.length ? `Đã xoá phần chưa làm, giữ ${keep.length} bài đã xong` : 'Đã xoá việc khỏi tồn đọng', false, 'Hoàn tác', () => commit(before.map(x => sv(x.type, x.obj)), 'Đã khôi phục'));
}
function postLines(v){
  const n = sl(v), ps = postsOf(v.id); let h = '';
  for (let i = 1; i <= Math.max(n, ps.length); i++) {
    const b = ps.find(x => num(x.stt) === i);
    const tail = b ? [b.dangBai, b.kenh].filter(Boolean).map(esc).join(' · ') : '';
    let st;
    if (b && b.link) st = `<a class="lnkbtn" href="${esc(b.link)}" target="_blank" rel="noopener">🔗 Mở bài</a> <span class="hint">đăng ${esc(dtShow(b.tgDang, v.ngay))}</span>`;
    else if (b && b.khongLink === '1') st = '<span style="color:var(--xong)">✓ Xong, không có link</span>';
    else st = `<span class="nolk">⚠ Chưa gắn link</span>${b && b.idea ? ` <span class="hint">· 🟡 ${esc(b.idea)}</span>` : ''}`;
    h += `<div class="pl"><b>Bài ${i}</b> ${st}${tail ? ` <span class="hint">· ${tail}</span>` : ''}</div>`;
  }
  return h;
}
function taskPopHtml(v){
  const k = stOf(v), ps = postsOf(v.id), n = sl(v);
  let h = `<div style="display:flex;justify-content:space-between;gap:12px"><b>${v.gap ? '⚡ ' : ''}${esc(v.viec)}</b><span style="white-space:nowrap">${ST[k].ic} ${ST[k].lb}</span></div>`;
  h += `<div class="hint">${esc(v.mang)}${v.nhom ? ' · ' + esc(v.nhom) : ''} · ${esc(v.chuDeTen)}</div>`;
  h += `<div>${timeBadge(v)} &nbsp;${pc(v.nguoi)}</div>`;
  const tags = arr(v.dangBai).concat(arr(v.kenh)); if (tags.length) h += `<div>📝 ${esc(tags.join(' · '))}</div>`;
  if (n) h += `<div>📄 Bài: <b>${ps.filter(isDoneP).length}/${n}</b></div>${postLines(v)}`;
  if (v.ghiChu) h += `<div>💬 ${esc(v.ghiChu)}</div>`;
  if (v.trangThai === 'Trì hoãn') h += `<div style="color:var(--tre)">⏸ ${esc(v.lyDo)} → ${esc(fmtD(v.doiNgay || v.ngay))} ${esc(v.doiCa || '')}</div>`;
  if (v.lichSu) h += `<div class="hint" style="white-space:pre-line">🕘 ${esc(v.lichSu.trim())}</div>`;
  return h;
}

function topPosts(bs, n){
  const ps = bs.filter(b => b.link && (num(b.binhLuan) || num(b.tiepCan))).sort((a, b) => num(b.binhLuan) - num(a.binhLuan) || num(b.tiepCan) - num(a.tiepCan)).slice(0, n);
  if (!ps.length) return '<div class="hint">Chưa có bài nào được điền số liệu.</div>';
  return `<div class="tbl"><table><tr><th>#</th><th>Mảng · chủ đề</th><th>Việc</th><th>Kênh</th><th>Dạng bài</th><th>Người</th><th>Đăng lúc</th><th class="c">💬</th><th class="c">👁</th><th class="c">👍</th><th>Link</th></tr>${ps.map((b, i) => { const v = bInfo(b); return `<tr><td>${i + 1}</td><td><b>${esc(v.mang)}</b> · ${esc(v.chuDeTen)}</td><td>${v.gap ? '⚡ ' : ''}${esc(v.viec || '')}</td><td>${esc(b.kenh)}</td><td>${esc(b.dangBai)}</td><td>${pc(v.nguoi)}</td><td>${esc(dtShow(b.tgDang, b.ngay))}</td><td class="c"><b>${esc(b.binhLuan)}</b></td><td class="c">${num(b.tiepCan).toLocaleString('vi-VN')}</td><td class="c">${esc(b.thich)}</td><td><a href="${esc(b.link)}" target="_blank" rel="noopener">mở ↗</a></td></tr>`; }).join('')}</table></div>`;
}
function topicRank(bs){
  const g = {}; bs.filter(b => b.link && (b.binhLuan || b.tiepCan)).forEach(b => { const v = bInfo(b); const k = v.mang + ' · ' + v.chuDeTen; (g[k] = g[k] || { k, n: 0, c: 0 }); g[k].n++; g[k].c += num(b.binhLuan); });
  return Object.values(g).map(x => Object.assign(x, { avg: x.c / x.n })).sort((a, b) => b.avg - a.avg);
}
function handoverSection(live, bs){
  const rk = topicRank(bs);
  const nx = nextSlot(S.date, S.ca);
  return `<div class="card sec"><h3>🔄 Bàn giao ${CA[S.ca].lb.toLowerCase()} → ${nx.ca === 'Tối' ? 'ca tối' : 'ca sáng ' + fmtD(nx.ngay)}</h3>
    <div class="grid2"><div><h3 style="font-size:14px">A. ${CA[S.ca].lb} làm được gì</h3>
      <div class="summary" style="margin:0 0 8px"><span><b>${live.filter(v => v.trangThai === 'Xong').length}/${live.length}</b> việc xong</span><span><b>${live.filter(v => stOf(v) === 'tre').length}</b> trì hoãn</span><span><b>${live.filter(v => stOf(v) === 'quagio').length}</b> quá giờ</span><span><b>${bs.filter(b => b.link).length}</b> bài đăng</span></div>
      <div class="hint" style="margin-bottom:4px">Chủ đề tương tác tốt nhất (💬 trung bình / bài)</div>
      ${rk.length ? rk.slice(0, 3).map(x => `<div>🟢 ${esc(x.k)} — <b>${Math.round(x.avg)}</b> 💬/bài (${x.n} bài)</div>`).join('') : '<div class="hint">Chưa đủ số liệu</div>'}
      <div class="hint" style="margin:8px 0 4px">Chủ đề tương tác thấp nhất</div>
      ${rk.length > 3 ? rk.slice(-3).reverse().map(x => `<div>🔻 ${esc(x.k)} — <b>${Math.round(x.avg)}</b> 💬/bài (${x.n} bài)</div>`).join('') : '<div class="hint">Chưa đủ số liệu</div>'}
    </div><div><h3 style="font-size:14px">Top bài tương tác tốt nhất</h3>${topPosts(bs, 5)}</div></div>
    <h3 style="font-size:14px;margin-top:14px">B. Bàn giao theo mảng</h3><div class="tbl"><table class="handover"><tr>${MANG.map(m => `<th style="${mcStyle(m)}">${esc(m)}</th>`).join('')}</tr><tr>${MANG.map(m => {
      const dv = slotTasks().filter(v => v.mang === m && v.trangThai === 'Trì hoãn');
      return `<td>${dv.length ? dv.map(v => `<div style="margin-bottom:3px">⏸ ${esc(v.viec)} <span class="muted">(${esc(v.lyDo)} → ${esc(fmtD(v.doiNgay || v.ngay))} ${esc(v.doiCa || '')})</span></div>`).join('') : '<span class="muted">Không có việc dời</span>'}</td>`; }).join('')}</tr><tr>${MANG.map(m => {
      const bg = S.banGiao.find(x => x.ngay === S.date && x.ca === S.ca && x.mang === m);
      return `<td><textarea data-f="bangiao" data-id="${esc(m)}" placeholder="Bàn giao ${esc(m)}…">${esc(bg ? bg.ghiChu : '')}</textarea></td>`; }).join('')}</tr></table></div>
    <div class="hint" style="margin-top:6px">Ghi chú tự lưu khi bấm ra ngoài ô.</div></div>`;
}
function renderWeek(vs, bs, w){
  const days = []; for (let i = 0; i < 7; i++) days.push(addDays(w.from, i));
  const data = days.map(d => { const v = vs.filter(x => x.ngay === d && isLive(x)); const b = bs.filter(x => x.ngay === d && x.link); return { d, done: v.filter(x => x.trangThai === 'Xong').length, total: v.length, posts: b.length, cmt: b.reduce((s, x) => s + num(x.binhLuan), 0) }; });
  const maxA = Math.max(1, ...data.map(x => Math.max(x.total, x.posts)));
  let h = `<div class="card sec"><h3>📈 Theo ngày trong tuần</h3><div class="legend" style="margin:0 0 6px"><span><i style="display:inline-block;width:10px;height:10px;background:var(--xong);border-radius:2px"></i> Việc xong</span><span><i style="display:inline-block;width:10px;height:10px;background:#2563EB;border-radius:2px"></i> Bài đăng</span><span>💬 = tổng bình luận</span></div><div class="bars">${data.map(x => `<div class="bday"><div class="bpair"><i style="height:${x.done / maxA * 140}px;background:var(--xong)" title="${x.done}/${x.total} việc xong"></i><i style="height:${x.posts / maxA * 140}px;background:#2563EB" title="${x.posts} bài"></i></div><b>${esc(fmtD(x.d))}</b><span class="muted">${x.done}/${x.total} · ${x.posts} bài · 💬 ${x.cmt}</span></div>`).join('')}</div></div>`;
  h += `<div class="card sec"><h3>🏆 Top 10 bài tương tác tốt nhất tuần</h3>${topPosts(bs, 10)}</div>`;
  const people = [...new Set(vs.map(v => v.nguoi).filter(Boolean))];
  h += `<div class="grid2"><div class="card sec"><h3>👥 Theo người</h3><div class="tbl"><table><tr><th>Người</th><th class="c">Việc</th><th class="c">Xong</th><th class="c">⏸</th><th class="c">Bài</th><th class="c">💬 / bài</th></tr>${people.map(p => { const v = vs.filter(x => x.nguoi === p && isLive(x)); const ids = new Set(v.map(x => x.id)); const b = bs.filter(x => ids.has(x.viecId) && x.link); const c = b.reduce((s, x) => s + num(x.binhLuan), 0); return `<tr><td>${pc(p)}</td><td class="c">${v.length}</td><td class="c">${v.filter(x => x.trangThai === 'Xong').length}</td><td class="c">${v.filter(x => x.trangThai === 'Trì hoãn').length}</td><td class="c">${b.length}</td><td class="c">${b.length ? Math.round(c / b.length) : '–'}</td></tr>`; }).join('')}</table></div></div>`;
  const ks = [...new Set(bs.filter(b => b.link).map(b => b.kenh).filter(Boolean))], ds = S.danhMuc.dangBai;
  h += `<div class="card sec"><h3>📌 Kênh × dạng bài (💬 trung bình / bài)</h3><div class="tbl"><table><tr><th>Kênh</th>${ds.map(d => `<th class="c">${esc(d)}</th>`).join('')}</tr>${ks.map(k => `<tr><td><b>${esc(k)}</b></td>${ds.map(d => { const b = bs.filter(x => x.link && x.kenh === k && x.dangBai === d); return `<td class="c">${b.length ? `<b>${Math.round(b.reduce((s, x) => s + num(x.binhLuan), 0) / b.length)}</b> <span class="muted">(${b.length})</span>` : '<span class="muted">–</span>'}</td>`; }).join('')}</tr>`).join('')}</table></div><div class="hint" style="margin-top:6px">Số trong ngoặc là số bài. Phân tích sâu hơn ở dashboard <b>Tổng quan</b> trong Lark Base.</div></div></div>`;
  return h;
}

