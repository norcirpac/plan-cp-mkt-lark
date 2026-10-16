/* =====================================================================
   TẦNG 1 – CÂY TỔNG THỂ
   ===================================================================== */
function renderCay(){
  const cds = cdsOf(S.date, S.ca);
  const live = slotTasks().filter(isLive);
  const done = live.filter(v => v.trangThai === 'Xong').length;
  const late = live.filter(v => stOf(v) === 'quagio').length;
  const noP = live.filter(v => !v.nguoi && v.trangThai === 'Chưa làm').length;
  let h = `<div class="bar">
    <button class="btn pri" data-act="newcd">+ Chủ đề</button>
    <button class="btn" data-act="paste">📋 Dán mẫu</button>
    <button class="btn" data-act="pcmodal">👥 Đổi người ca này</button>
    ${S.ca === 'Sáng' ? '<button class="btn" data-act="handover">🔄 Bàn giao ca tối</button>' : ''}
    <span class="legend"><span>⚪ Chưa làm</span><span>🟡 Đang làm</span><span>✅ Xong</span><span>🔴 Quá giờ</span><span>⏸ Trì hoãn</span><span>⚡ Việc gấp</span></span></div>
    <div class="summary"><span><b>${cds.length}</b> chủ đề</span><span><b>${done}/${live.length}</b> việc xong</span><span style="${late ? 'color:var(--quagio)' : ''}"><b>${late}</b> việc quá giờ</span>${noP ? `<span style="color:var(--quagio)"><b>${noP}</b> việc chưa có người</span>` : ''}<span class="muted">· Kéo thả chủ đề / việc nhỏ để sắp xếp</span></div>`;
  if (!cds.length) h += `<div class="card" style="margin-bottom:12px">Chưa có chủ đề cho <b>${CA[S.ca].lb} · ${esc(fmtD(S.date))}</b>. Bấm <b>📋 Dán mẫu</b> để tạo nhanh từ các khối mẫu, hoặc <b>+ Chủ đề</b>.</div>`;
  h += `<div class="mmwrap" id="mmwrap"><div class="mm" id="mm"><svg class="lines" id="lines"></svg><div class="row">
    <div class="col"><div class="nd root" id="n-root">${CA[S.ca].lb}<small>${esc(fmtD(S.date))}</small></div></div>
    <div class="col c-mang">`;
  MANG.forEach((m, mi) => {
    const list = cds.filter(c => c.mang === m);
    const mts = list.flatMap(c => S.viec.filter(v => v.chuDeId === c.id)).filter(isLive);
    const fk = 'm|' + m, folded = S.fold.has(fk);
    const P = pcPeople(S.macDinh, S.ca, m);
    h += `<div class="row" style="${mcStyle(m)}"><div class="col"><div class="nd mang" id="n-m-${mi}" data-p="n-root" data-c="${MC[m].ln}">
      <span class="fold" data-act="fold" data-k="${esc(fk)}">${folded ? '▸' : '▾'}</span>${esc(m)}
      <span class="sub">${list.length} chủ đề · ${mts.filter(v => v.trangThai === 'Xong').length}/${mts.length} việc xong</span>
      ${P.length ? `<div class="ppl">${P.map(pc).join('')}</div>` : ''}
      <button class="dots" data-act="menu-mang" data-m="${esc(m)}">⋯</button></div></div>`;
    if (folded) { h += `</div>`; return; }
    if (NHOM_MANG[m]) {
      h += `<div class="col c-nhom">`;
      nhomsOf(m, list).forEach((g, gi) => {
        const gl = list.filter(c => cdNhom(c) === g);
        const gts = gl.flatMap(c => S.viec.filter(v => v.chuDeId === c.id)).filter(isLive);
        const gk = 'g|' + m + '|' + g, gf = S.fold.has(gk);
        const nid = `n-g-${mi}-${gi}`;
        h += `<div class="row"><div class="col"><div class="nd nhom" id="${nid}" data-p="n-m-${mi}" data-c="${MC[m].ln}" data-dz="nhom" data-m="${esc(m)}" data-nhom="${esc(g)}">
          <span class="fold" data-act="fold" data-k="${esc(gk)}">${gf ? '▸' : '▾'}</span>${esc(g)}<span class="sub">${gl.length} chủ đề · ${gts.filter(v => v.trangThai === 'Xong').length}/${gts.length} việc xong</span>
          <button class="dots" data-act="menu-nhom" data-m="${esc(m)}" data-nhom="${esc(g)}">⋯</button></div></div>`;
        if (!gf) {
          h += `<div class="col c-cd">`;
          gl.forEach(cd => h += cdNode(cd, m, nid));
          h += `<div class="nd add" data-act="newcd" data-m="${esc(m)}" data-nhom="${esc(g)}" data-dz="nhomend" data-nhom2="${esc(g)}" data-mm="${esc(m)}">+ Chủ đề</div></div>`;
        }
        h += `</div>`;
      });
      h += `<div class="row"><div class="col"><div class="nd add addnhom" data-act="newnhom" data-m="${esc(m)}">+ Nhóm</div></div></div>`;
      h += `</div></div>`;
    } else {
      h += `<div class="col c-cd">`;
      list.forEach(cd => h += cdNode(cd, m, `n-m-${mi}`));
      h += `<div class="nd add" data-act="newcd" data-m="${esc(m)}" data-dz="nhomend" data-nhom2="" data-mm="${esc(m)}">+ Chủ đề ${esc(m)}</div></div></div>`;
    }
  });
  h += `</div></div></div></div>`;
  return h;
}
function cdNode(cd, m, parent){
  const gs = groupsOfCd(cd.id);
  const ts = gs.flat().filter(isLive);
  const done = ts.filter(v => v.trangThai === 'Xong').length;
  const tgt = ts.reduce((s, v) => s + (sl(v) || 0), 0), posted = ts.reduce((s, v) => s + linksOf(v.id), 0);
  const P = arr(cd.nguoi);
  let h = `<div class="row"><div class="col"><div class="nd cd" id="n-c-${cd.id}" data-p="${parent}" data-c="${MC[m].ln}" draggable="true" data-dg="cd" data-id="${cd.id}" data-m="${esc(m)}" data-act="editcd" title="Bấm để sửa chủ đề">
    <div class="ttl">${esc(cd.chuDe)}</div>
    <div class="who">${P.length ? P.map(pc).join('') : '<span class="chip miss">Chưa phân công</span>'}</div>
    <div class="meta">${ts.length ? `<span class="chip ${done >= ts.length ? 'ok' : 'warn'}">${done}/${ts.length} việc xong</span>` : '<span class="chip miss">Chưa có việc nhỏ</span>'}${tgt ? `<span class="chip ${posted >= tgt ? 'ok' : 'warn'}">${posted}/${tgt} bài</span>` : ''}${arr(cd.kenhCan).map(k => `<span class="chip">${esc(k)}</span>`).join('')}</div>
    ${cd.ghiChu ? `<div class="hint" style="margin-top:4px">📝 ${esc(cd.ghiChu)}</div>` : ''}
    <button class="dots" data-act="menu-cd" data-id="${cd.id}">⋯</button></div></div><div class="col c-task">`;
  gs.forEach(g => h += taskNode(g, cd, m));
  h += `<div class="nd add" data-act="newv" data-cd="${cd.id}" data-p="n-c-${cd.id}" data-c="${MC[m].ln}" id="n-a-${cd.id}" data-dz="cdend" data-cd2="${cd.id}" data-mm="${esc(m)}">+ Việc nhỏ</div></div></div>`;
  return h;
}
function aggSt(g){
  const s = g.map(stOf);
  if (s.includes('quagio')) return 'quagio';
  if (s.every(x => x === 'xong' || x === 'bo')) return s.every(x => x === 'bo') ? 'bo' : 'xong';
  if (s.some(x => x === 'dang' || x === 'xong')) return 'dang';
  if (s.every(x => ['tre','bo','chuyen'].includes(x))) return s.includes('tre') ? 'tre' : 'chuyen';
  return 'chua';
}
function taskNode(g, cd, m){
  const v0 = g[0], key = gkey(v0), k = aggSt(g);
  const ns = [...new Set(g.map(v => sl(v)))];
  const nChip = ns.length === 1 ? (ns[0] === 0 ? '' : `<span class="chip warn"><b>${ns[0]}</b>&nbsp;bài</span>`) : '';
  return `<div class="nd task s-${k}" id="n-t-${key}" data-p="n-c-${cd.id}" data-c="${MC[m].ln}" draggable="true" data-dg="task" data-key="${key}" data-m="${esc(m)}" data-act="editv">
    <div class="l1">${timeBadge(v0)}<span class="nm">${esc(v0.viec)}</span></div>
    <div class="l2">${arr(v0.dangBai).map(d => `<span class="chip dg">${esc(d)}</span>`).join('')}${nChip}${arr(v0.kenh).map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>
    ${g.map(personLine).join('')}
    <button class="dots" data-act="menu-v" data-key="${key}">⋯</button></div>`;
}
function personLine(v){
  const k = stOf(v), n = sl(v), ps = postsOf(v.id);
  let mid = '';
  if (n) {
    let d = ''; const max = Math.max(n, ps.length);
    for (let i = 1; i <= max; i++) { const b = ps.find(x => num(x.stt) === i); d += `<i class="pd ${b && b.link ? 'ok' : b && b.khongLink === '1' ? 'nolink' : b && b.idea ? 'idea' : 'none'}"></i>`; }
    mid = `<span class="pds" data-act="postpop" data-id="${v.id}" title="Xem từng bài">${d}</span><span class="muted">${ps.filter(isDoneP).length}/${n} bài</span>`;
  }
  const extra = k === 'tre' ? `<span style="color:var(--tre)">→ ${esc(fmtD(v.doiNgay || v.ngay))} ${esc(v.doiCa || '')}</span>` : k === 'chuyen' ? '<span class="muted">đã chuyển</span>' : k === 'bo' ? '<span class="muted">đã bỏ</span>' : k === 'dang' && v.trangThai === 'Đang làm' ? '<span style="color:var(--dang);font-weight:600">đang làm</span>' : '';
  return `<div class="pline"><span class="sic" title="${ST[k].lb}">${ST[k].ic}</span>${pc(v.nguoi)}${mid}${extra}</div>`;
}

function drawLines(){
  const mm = document.getElementById('mm'), svg = document.getElementById('lines'); if (!mm || !svg) return;
  const R = mm.getBoundingClientRect();
  svg.setAttribute('width', mm.scrollWidth); svg.setAttribute('height', mm.scrollHeight);
  let paths = '';
  mm.querySelectorAll('[data-p]').forEach(el => {
    const p = document.getElementById(el.dataset.p); if (!p) return;
    const a = p.getBoundingClientRect(), b = el.getBoundingClientRect();
    const x1 = a.right - R.left, y1 = a.top + a.height / 2 - R.top, x2 = b.left - R.left, y2 = b.top + b.height / 2 - R.top;
    const dx = Math.max(16, (x2 - x1) * 0.5);
    paths += `<path d="M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}" fill="none" stroke="${el.dataset.c || '#CBD2DC'}" stroke-opacity="${el.classList.contains('add') ? .3 : .75}" stroke-width="${el.classList.contains('mang') ? 3 : el.classList.contains('nhom') ? 2.2 : 1.6}"/>`;
  });
  svg.innerHTML = paths;
}
window.addEventListener('resize', () => { if (S.tab === 'cay') drawLines(); });

/* ---------- kéo thả ---------- */
let DRAG = null;
function clearDrop(){ document.querySelectorAll('.drop-before,.drop-after,.drop-in').forEach(x => x.classList.remove('drop-before','drop-after','drop-in')); }
function dropTarget(e){
  if (!DRAG) return null;
  const el = e.target.closest('[data-dg],[data-dz]'); if (!el) return null;
  const m = el.dataset.m || el.dataset.mm; if (m !== DRAG.m) return null;
  const r = el.getBoundingClientRect(), before = e.clientY < r.top + r.height / 2;
  if (DRAG.kind === 'cd') {
    if (el.dataset.dg === 'cd' && el.dataset.id !== DRAG.id) return { el, type: 'cd', id: el.dataset.id, pos: before ? 'before' : 'after' };
    if (el.dataset.dz === 'nhom') return { el, type: 'nhom', nhom: el.dataset.nhom, pos: 'in' };
    if (el.dataset.dz === 'nhomend') return { el, type: 'nhom', nhom: el.dataset.nhom2, pos: 'in' };
  } else {
    if (el.dataset.dg === 'task' && el.dataset.key !== DRAG.key) return { el, type: 'task', key: el.dataset.key, pos: before ? 'before' : 'after' };
    if (el.dataset.dg === 'cd') return { el, type: 'cd', id: el.dataset.id, pos: 'in' };
    if (el.dataset.dz === 'cdend') return { el, type: 'cd', id: el.dataset.cd2, pos: 'in' };
  }
  return null;
}
let DRAG2 = null;
const slotTasksFor = (p, ca) => slotTasks().filter(v => v.nguoi === p && v.ca === ca && isLive(v) && (v.caCa === '1' || !v.batDau));
document.addEventListener('dragstart', e => {
  const row = e.target.closest && e.target.closest('[data-dgm]');
  if (row) { if (row.getAttribute('draggable') !== 'true') return; DRAG2 = row.dataset.dgm; try { e.dataTransfer.setData('text/plain', 'x'); e.dataTransfer.effectAllowed = 'move'; } catch(err){} setTimeout(() => row.classList.add('dragging'), 0); closeMenu(); return; }
  const el = e.target.closest && e.target.closest('[data-dg]'); if (!el) return;
  DRAG = el.dataset.dg === 'cd' ? { kind: 'cd', id: el.dataset.id, m: el.dataset.m } : { kind: 'task', key: el.dataset.key, m: el.dataset.m };
  try { e.dataTransfer.setData('text/plain', 'x'); e.dataTransfer.effectAllowed = 'move'; } catch(err){}
  setTimeout(() => el.classList.add('dragging'), 0); closeMenu();
});
document.addEventListener('dragover', e => {
  if (DRAG2) { const t2 = myDropTarget(e); clearDrop(); if (!t2) return; e.preventDefault(); t2.el.classList.add(t2.pos === 'before' ? 'drop-before' : t2.pos === 'after' ? 'drop-after' : 'drop-in'); return; }
  const t = dropTarget(e); clearDrop(); if (!t) return;
  e.preventDefault(); t.el.classList.add(t.pos === 'before' ? 'drop-before' : t.pos === 'after' ? 'drop-after' : 'drop-in');
});
document.addEventListener('drop', e => {
  if (DRAG2) { const t2 = myDropTarget(e); clearDrop(); if (!t2) return; e.preventDefault(); const id = DRAG2; DRAG2 = null; myDrop(id, t2); return; }
  const t = dropTarget(e); clearDrop(); if (!t) return; e.preventDefault();
  if (DRAG.kind === 'cd') moveCd(DRAG.id, t); else moveTask(DRAG.key, t);
});
document.addEventListener('dragend', () => { clearDrop(); document.querySelectorAll('.dragging').forEach(x => x.classList.remove('dragging')); DRAG = null; DRAG2 = null; });
function moveCd(id, t){
  const c = cdById(id); if (!c) return;
  const tgtCd = t.type === 'cd' ? cdById(t.id) : null;
  const nhom = NHOM_MANG[c.mang] ? (tgtCd ? cdNhom(tgtCd) : t.nhom) : '';
  const list = cdsOf(S.date, S.ca).filter(x => x.mang === c.mang && cdNhom(x) === nhom && x.id !== id);
  let idx = list.length;
  if (tgtCd) { idx = list.findIndex(x => x.id === tgtCd.id); if (t.pos === 'after') idx++; }
  list.splice(idx, 0, c);
  const ops = [];
  list.forEach((x, i) => { const nx = Object.assign({}, x, { thuTu: String(i + 1) }); if (x.id === id) nx.nhom = nhom; if (nx.thuTu !== x.thuTu || nx.nhom !== x.nhom) ops.push(sv('chude', nx)); });
  if (c.nhom !== nhom) S.viec.filter(v => v.chuDeId === id).forEach(v => ops.push(sv('viec', Object.assign({}, v, { nhom }))));
  commit(ops, c.nhom !== nhom ? `Đã chuyển chủ đề sang nhóm ${nhom}` : '');
}
function moveTask(key, t){
  const g = S.viec.filter(v => gkey(v) === key); if (!g.length) return;
  const tCd = t.type === 'cd' ? cdById(t.id) : cdById((S.viec.find(v => gkey(v) === t.key) || {}).chuDeId);
  if (!tCd) return;
  const groups = groupsOfCd(tCd.id).filter(x => gkey(x[0]) !== key);
  let idx = groups.length;
  if (t.type === 'task') { idx = groups.findIndex(x => gkey(x[0]) === t.key); if (t.pos === 'after') idx++; }
  groups.splice(idx, 0, g);
  const ops = [], moved = g[0].chuDeId !== tCd.id;
  groups.forEach((gr, i) => gr.forEach(v => {
    const nv = Object.assign({}, v, { thuTu: String(i + 1) });
    if (gkey(v) === key) Object.assign(nv, { chuDeId: tCd.id, chuDeTen: tCd.chuDe, nhom: tCd.nhom });
    if (nv.thuTu !== v.thuTu || nv.chuDeId !== v.chuDeId) ops.push(sv('viec', nv));
  }));
  if (moved) g.forEach(v => postsOf(v.id).forEach(b => ops.push(sv('bai', Object.assign({}, b, { chuDeTen: tCd.chuDe })))));
  commit(ops, moved ? `Đã chuyển việc sang "${tCd.chuDe}"` : '');
}

