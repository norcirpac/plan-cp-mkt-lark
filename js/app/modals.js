/* =====================================================================
   MODAL
   ===================================================================== */
function openModal(html, wide){ const s = $('sheet'); s.className = 'sheet' + (wide ? ' wide' : ''); s.innerHTML = html; $('modal').classList.remove('hidden'); }
function closeModal(){ $('modal').classList.add('hidden'); }
function confirmModal(title, msg, okLb, fn){
  window._cf = fn;
  openModal(`<h2>${title}</h2><div style="margin-bottom:12px">${msg}</div><div class="mfoot"><button class="btn" data-act="close">Huỷ</button><button class="btn pri" data-act="cfok">${esc(okLb)}</button></div>`);
}

/* ---------- Chủ đề ---------- */
function cdModal(id, mang, nhom){
  const cd = id ? cdById(id) : null;
  const m0 = cd ? cd.mang : (mang || MANG[0]);
  const P = pcPeople(S.macDinh, S.ca, m0);
  const st = window._cm = { id, kind: cd ? 'keep' : '', isNew: false };
  const newNhom = nhom === '__new';
  openModal(`<h2>${id ? 'Sửa chủ đề' : newNhom ? 'Nhóm mới' : 'Chủ đề mới'} · ${CA[S.ca].lb} ${esc(fmtD(S.date))}</h2>${newNhom ? `<div class="hint" style="margin:-6px 0 10px">Gõ tên nhóm (vd Thứ 6 Thời trang) và chủ đề đầu tiên của nhóm. Muốn dùng lại các tuần sau: bấm ⋯ ở ô nhóm → Lưu nhóm này thành khối mẫu.</div>` : ''}
    <div class="r2"><div class="f"><label>Mảng</label><select id="c_mang">${MANG.map(m => `<option ${m === m0 ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
      <div class="f" id="c_nhomwrap"><label>Nhóm</label><select id="c_nhom"></select><input id="c_nhomnew" placeholder="Tên nhóm mới, vd Sale 11/11" style="display:none;margin-top:6px"></div></div>
    <div class="f"><label>Chủ đề</label>${comboHtml('c_combo', 'Gõ để tìm hoặc thêm chủ đề mới…', cd ? cd.chuDe : '')}
      <label class="chk" id="c_savewrap" style="display:none;margin-top:4px"><input type="checkbox" id="c_save" checked> Lưu vào danh sách chọn nhanh</label></div>
    <div class="f"><label>Người phụ trách</label>${msel('cnguoi', names(), cd ? cd.nguoi : (P.length === 1 ? P[0] : ''), 'Chưa phân công')}</div>
    <div class="f"><label>Kênh cần đăng</label>${picks('kenh', S.danhMuc.kenh, cd ? cd.kenhCan : '')}</div>
    <div class="f"><label>Ghi chú / định hướng</label><textarea id="c_gc">${esc(cd ? cd.ghiChu : '')}</textarea></div>
    <div class="mfoot"><button class="btn" data-act="close">Huỷ</button><button class="btn pri" data-act="savecd">Lưu</button></div>`);
  const fillNhom = (keep) => {
    const m = $('c_mang').value, opts = nhomOptions(m);
    $('c_nhomwrap').style.display = NHOM_MANG[m] ? '' : 'none';
    const cur = keep ? (cd ? cdNhom(cd) : (nhom || defNhom(m))) : defNhom(m);
    $('c_nhom').innerHTML = opts.map(g => `<option ${g === cur ? 'selected' : ''}>${esc(g)}</option>`).join('') + (NHOM_MANG[m] ? `<option value="__new" ${cur === '__new' ? 'selected' : ''}>➕ Nhóm mới…</option>` : '');
    $('c_nhomnew').style.display = cur === '__new' ? '' : 'none';
  };
  fillNhom(true);
  if (newNhom) setTimeout(() => { const x = $('c_nhomnew'); if (x) x.focus(); }, 50);
  COMBO.c_combo = {
    items: () => libCd($('c_mang').value).filter(x => !NHOM_MANG[$('c_mang').value] || !x.nhom || x.nhom === curNhom()).map(x => ({ key: 'lib:' + x.ten, label: x.ten, group: '📋 Chủ đề thường dùng', kenh: x.kenh }))
      .concat(libCd($('c_mang').value).filter(x => NHOM_MANG[$('c_mang').value] && x.nhom && x.nhom !== curNhom()).map(x => ({ key: 'lib:' + x.ten, label: x.ten, group: '📋 Nhóm khác', kenh: x.kenh }))),
    onPick: it => { st.kind = it.key === '__new' ? 'new' : 'lib'; $('c_savewrap').style.display = st.kind === 'new' ? '' : 'none'; if (it.kenh && !id) setPicks('kenh', it.kenh); },
    onType: () => { const v = $('c_combo_in').value.trim(); st.kind = libCd($('c_mang').value).some(x => x.ten === v) ? 'lib' : (cd && v === cd.chuDe ? 'keep' : 'new'); $('c_savewrap').style.display = st.kind === 'new' && v ? '' : 'none'; }
  };
  $('c_mang').addEventListener('change', () => { fillNhom(false); if (!id) { const P2 = pcPeople(S.macDinh, S.ca, $('c_mang').value); setMsel('cnguoi', P2.length === 1 ? [P2[0]] : []); } });
  $('c_nhom').addEventListener('change', () => { $('c_nhomnew').style.display = $('c_nhom').value === '__new' ? '' : 'none'; });
}
const curNhom = () => { const s = $('c_nhom'); if (!s) return ''; return s.value === '__new' ? $('c_nhomnew').value.trim() : s.value; };
function setMsel(name, list){
  const el = document.querySelector(`[data-msel="${name}"]`); if (!el) return;
  el.dataset.val = list.join(', ');
  el.querySelectorAll('input[type=checkbox]').forEach(c => c.checked = list.includes(c.value));
  el.querySelector('.msel-btn').innerHTML = mselLabel(list, el.dataset.ph);
}
function saveCd(){
  const st = window._cm, id = st.id;
  const mang = $('c_mang').value, name = $('c_combo_in').value.trim();
  if (NHOM_MANG[mang] && $('c_nhom').value === '__new' && !$('c_nhomnew').value.trim()) return toast('Nhập tên nhóm mới', true);
  if (!name) return toast('Chọn hoặc nhập tên chủ đề', true);
  const nhom = NHOM_MANG[mang] ? (curNhom() || defNhom(mang)) : '';
  const old = id ? cdById(id) : null;
  const maxT = cdsOf(S.date, S.ca).reduce((mx, c) => Math.max(mx, num(c.thuTu)), 0);
  const cd = Object.assign({}, old || { thuTu: String(maxT + 1) }, { id: id || uid('cd'), ngay: S.date, ca: S.ca, mang, nhom, chuDe: name, nguoi: readMsel('cnguoi').join(', '), kenhCan: readPicks('kenh'), ghiChu: $('c_gc').value.trim() });
  const ops = [sv('chude', cd)];
  const P = arr(cd.nguoi);
  S.viec.filter(v => v.chuDeId === cd.id).forEach(v => {
    const nv = Object.assign({}, v, { mang: cd.mang, chuDeTen: cd.chuDe, nhom: cd.nhom });
    if (!v.nguoi && P.length === 1 && v.trangThai === 'Chưa làm') nv.nguoi = P[0];
    if (JSON.stringify(nv) !== JSON.stringify(v)) ops.push(sv('viec', nv));
  });
  if (st.kind === 'new' && $('c_save').checked && !libCd(mang).some(x => x.ten === name)) ops.push(sv('thuvien', { id: uid('tv'), loai: 'chude', mang, nhom, chuDeTen: '', ten: name, kenh: cd.kenhCan, dangBai: '', caCa: '', batDau: '', ketThuc: '', soLuong: '' }));
  closeModal(); commit(ops, 'Đã lưu chủ đề');
}

/* ---------- Việc nhỏ (trên cây: sửa chung cả nhóm người) ---------- */
function cdOptions(sel){
  const cds = cdsOf(S.date, S.ca);
  return MANG.map(m => { const l = cds.filter(c => c.mang === m); return l.length ? `<optgroup label="${m}">${l.map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc((cdNhom(c) ? cdNhom(c) + ' · ' : '') + c.chuDe)}</option>`).join('')}</optgroup>` : ''; }).join('') || '<option value="">(Chưa có chủ đề trong ca này)</option>';
}
function vModal(key, cdId){
  const grp = key ? S.viec.filter(v => gkey(v) === key && v.trangThai !== 'Đã chuyển') : [];
  const v0 = grp[0] || null;
  const cd = cdById(v0 ? v0.chuDeId : cdId) || null;
  const me = names().includes(cfg.me) ? cfg.me : '';
  const people = v0 ? [...new Set(grp.map(x => x.nguoi).filter(Boolean))] : (me ? [me] : (cd && arr(cd.nguoi).length === 1 ? arr(cd.nguoi) : []));
  const sameN = grp.length <= 1 || grp.every(x => String(x.soLuong) === String(v0.soLuong));
  const st = window._vm = { key, kind: v0 ? 'keep' : '', ref: null, force: false, slOk: false };
  const slCur = v0 ? String(sl(v0)) : '1';
  openModal(`<h2>${key ? 'Sửa việc nhỏ' : 'Việc nhỏ mới'} · ${CA[S.ca].lb} ${esc(fmtD(S.date))}</h2>
    ${key && grp.length > 1 ? '<div class="hint" style="margin:-6px 0 10px">Sửa ở đây là sửa chung cho tất cả người làm việc này.</div>' : ''}
    <div class="r2"><div class="f"><label>Người làm</label>${msel('vnguoi', names(), people, 'Chưa có người')}</div><div class="f"><label>Chủ đề</label><select id="v_cd">${cdOptions(cd ? cd.id : '')}</select></div></div>
    <div class="f"><label>Việc cụ thể</label>${comboHtml('v_combo', 'Gõ để tìm hoặc thêm việc mới…', v0 ? v0.viec : '')}
      <label class="chk" id="v_savewrap" style="display:none;margin-top:4px"><input type="checkbox" id="v_save" checked> Lưu vào danh sách chọn nhanh</label></div>
    <div class="f"><label class="chk"><input type="checkbox" id="v_caca" ${v0 && (v0.caCa === '1' || !v0.batDau) ? 'checked' : ''}> Không cố định giờ (cả ca)</label></div>
    <div class="r2" id="v_times"><div class="f"><label>Bắt đầu</label><select id="v_bd">${tOpts(v0 ? v0.batDau : '')}</select></div><div class="f"><label>Kết thúc</label><select id="v_kt">${tOpts(v0 ? v0.ketThuc : '')}</select></div></div>
    <div class="f"><label>Kênh đăng</label>${picks('vkenh', S.danhMuc.kenh, v0 ? v0.kenh : (cd ? cd.kenhCan : ''))}</div>
    <div class="f"><label>Dạng bài <span style="font-weight:400">(chọn được nhiều)</span></label>${picks('vdang', S.danhMuc.dangBai, v0 ? v0.dangBai : '')}</div>
    <div class="r2"><div class="f"><label>Số lượng bài</label><select id="v_sl">${slOpts(slCur)}</select>${!sameN ? '<span class="hint">Đang khác nhau giữa các người, lưu sẽ áp cho tất cả.</span>' : ''}</div>
      <div class="f"><label>Ghi chú</label><input id="v_gc" value="${esc(v0 ? v0.ghiChu : '')}"></div></div>
    <div id="v_warn"></div>
    <div class="mfoot"><button class="btn" data-act="close">Huỷ</button><button class="btn pri" data-act="savev">Lưu</button></div>`);
  const toggleTimes = () => { $('v_times').style.display = $('v_caca').checked ? 'none' : ''; };
  toggleTimes();
  $('v_caca').addEventListener('change', toggleTimes);
  ['v_bd','v_kt'].forEach(x => $(x).addEventListener('change', () => { st.force = false; $('v_warn').innerHTML = ''; }));
  $('v_cd').addEventListener('change', () => { const c2 = cdById($('v_cd').value); if (c2 && !key) setPicks('vkenh', c2.kenhCan); });
  COMBO.v_combo = {
    items: q => { const c2 = cdById($('v_cd').value); if (!c2) return [];
      const own = new Map(), G = '📋 Việc của chủ đề này';
      libViec(c2.mang, c2.chuDe).forEach(x => own.set(x.ten, { key: 'lib:' + x.ten, label: x.ten, group: G, src: x.data }));
      S.viec.filter(v => v.chuDeId === c2.id && !v.gap).forEach(v => { if (!own.has(v.viec)) own.set(v.viec, { key: 'lib:' + v.viec, label: v.viec, group: G, src: v }); });
      const out = [...own.values()], nq = norm(q).trim();
      if (nq) { const seen = new Set(out.map(x => x.label)), oth = [];
        libItems().filter(x => x.kind === 'v' && x.mang === c2.mang && x.cd !== c2.chuDe && norm(x.ten).includes(nq)).forEach(x => { if (seen.has(x.ten) || oth.length >= 8) return; seen.add(x.ten); oth.push({ key: 'oth:' + x.ten, label: x.ten, group: '🔎 Từ chủ đề khác', html: `${esc(x.ten)} <span class="hint">· ${esc(x.cd)}</span>`, src: x.data }); });
        out.push(...oth); }
      return out; },
    onPick: it => {
      st.kind = it.key.startsWith('lib:') ? 'lib' : 'new'; st.ref = it.src || null;
      $('v_savewrap').style.display = st.kind === 'new' && it.label ? '' : 'none';
      const s = it.src; if (!s) return;
      const t = fitShift(S.ca, s.caCa, s.batDau, s.ketThuc);
      $('v_caca').checked = t.caCa === '1'; $('v_bd').value = t.batDau; $('v_kt').value = t.ketThuc; toggleTimes();
      if (s.kenh) setPicks('vkenh', s.kenh); if (s.dangBai) setPicks('vdang', s.dangBai);
      const want = String(s.soLuong) === '0' ? '0' : String(num(s.soLuong) || 1); if ([...$('v_sl').options].some(o => o.value === want)) $('v_sl').value = want;
    },
    onType: () => { const v = $('v_combo_in').value.trim(); const c2 = cdById($('v_cd').value);
      st.kind = c2 && libViec(c2.mang, c2.chuDe).some(x => x.ten === v) ? 'lib' : (v0 && v === v0.viec ? 'keep' : 'new'); st.ref = null;
      $('v_savewrap').style.display = st.kind === 'new' && v ? '' : 'none'; }

  };
}
const badEnd = (bd, kt) => !!(bd && kt && mins(kt) <= mins(bd));
function overlaps(people, caCa, bd, kt, exclKey){
  if (caCa || !bd) return [];
  const s = mins(bd); let e = mins(kt); if (e == null) e = s + 15; if (e <= s) e += 1440;
  return slotTasks().filter(v => people.includes(v.nguoi) && gkey(v) !== exclKey && ['Chưa làm','Xong'].includes(v.trangThai) && v.caCa !== '1' && v.batDau && !v.gap).filter(v => { const [a, b] = span(v); return a < e && s < b; });
}
function saveV(){
  const st = window._vm;
  const people = readMsel('vnguoi');
  const cd = cdById($('v_cd').value); if (!cd) return toast('Cần chọn chủ đề (leader tạo chủ đề trước)', true);
  const name = $('v_combo_in').value.trim(); if (!name) return toast('Chọn hoặc nhập việc cụ thể', true);
  const caCa = $('v_caca').checked ? '1' : '', bd = caCa ? '' : $('v_bd').value, kt = caCa ? '' : $('v_kt').value;
  if (!caCa && !bd) return toast('Chọn giờ bắt đầu, hoặc tick "Không cố định giờ"', true);
  if (badEnd(bd, kt)) return toast('Giờ kết thúc phải sau giờ bắt đầu', true);
  const slEl = $('v_sl'), slv = slEl ? slEl.value : null;
  if (!st.force) {
    const ov = overlaps(people, caCa, bd, kt, st.key || '__new');
    if (ov.length) {
      const by = {}; ov.forEach(v => (by[v.nguoi] = by[v.nguoi] || []).push(v));
      $('v_warn').innerHTML = `<div class="warnbox">⚠️ ${Object.keys(by).map(p => `<div><b>${p === cfg.me ? 'Bạn' : esc(p)}</b> đã có việc trùng giờ: ${by[p].map(v => `${esc(v.viec)} (${esc(timeLb(v))})`).join(', ')}</div>`).join('')}<div class="bar"><button class="btn sm" data-act="saveforce">Vẫn lưu</button><button class="btn sm pri" data-act="fixtime">Sửa giờ</button></div></div>`;
      return;
    }
  }
  const sh = { chuDeId: cd.id, chuDeTen: cd.chuDe, mang: cd.mang, nhom: cd.nhom, viec: name, caCa, batDau: bd, ketThuc: kt, kenh: readPicks('vkenh'), dangBai: readPicks('vdang'), ghiChu: $('v_gc').value.trim() };
  let ops = [];
  if (!st.key) {
    const key = uid('g'); const order = groupsOfCd(cd.id).length + 1;
    (people.length ? people : ['']).forEach(p => ops.push(sv('viec', newTask(Object.assign({}, sh, { ngay: S.date, ca: S.ca, cd, nguoi: p, nhomViec: key, soLuong: slv || '1', thuTu: order })))));
  } else {
    const grp = S.viec.filter(v => gkey(v) === st.key && v.trangThai !== 'Đã chuyển');
    const left = people.slice(); const kept = [];
    const blocked = [];
    grp.forEach(v => {
      let who = null;
      if (v.nguoi && left.includes(v.nguoi)) who = v.nguoi;
      else if (!v.nguoi && left.length) who = left[0];
      if (who != null) { left.splice(left.indexOf(who), 1); kept.push(Object.assign({}, v, sh, { nguoi: who })); return; }
      if (!people.length && !kept.length) { kept.push(Object.assign({}, v, sh, { nguoi: '' })); return; }
      if (postsOf(v.id).length || v.trangThai !== 'Chưa làm') { blocked.push(v.nguoi); kept.push(Object.assign({}, v, sh)); return; }
      ops.push(dl('viec', v.id));
    });
    left.forEach(p => kept.push(newTask(Object.assign({}, sh, { ngay: S.date, ca: S.ca, cd, nguoi: p, nhomViec: st.key, soLuong: grp[0] ? grp[0].soLuong : '', goiY: grp[0] ? grp[0].goiY : '', thuTu: grp[0] ? grp[0].thuTu : '' }))));
    if (slEl && slv !== '') {
      const drops = [];
      for (const v of kept) {
        const ps = postsOf(v.id), links = ps.filter(b => b.link).length;
        if (num(slv) < links) return toast(`${v.nguoi || 'Việc'} đã đăng ${links} bài, không giảm dưới ${links} được`, true);
        ps.filter(b => num(b.stt) > num(slv)).forEach(b => drops.push({ v, b }));
      }
      if (drops.length && !st.slOk) {
        $('v_warn').innerHTML = `<div class="warnbox">⚠️ Giảm còn ${slv} bài sẽ xoá idea đã lên ở: ${drops.map(x => `${esc(x.v.nguoi || '')} bài ${esc(x.b.stt)}`).join(', ')}.<div class="bar"><button class="btn sm" data-act="close">Huỷ</button><button class="btn sm pri" data-act="slok">Đồng ý giảm</button></div></div>`;
        return;
      }
      drops.forEach(x => ops.push(dl('bai', x.b.id)));
      kept.forEach(v => { v.soLuong = slv; });
    }
    kept.forEach(v => { v.trangThai = autoStatus(v, postsOf(v.id).filter(b => !slv || num(b.stt) <= num(slv))); ops.push(sv('viec', v)); });
    if (blocked.length) toast(`Giữ lại phần của ${blocked.filter(Boolean).join(', ')} vì đã có bài / đã làm`);
  }
  if (st.kind === 'new' && $('v_save') && $('v_save').checked && !libViec(cd.mang, cd.chuDe).some(x => x.ten === name)) ops.push(sv('thuvien', { id: uid('tv'), loai: 'viec', mang: cd.mang, nhom: cd.nhom, chuDeTen: cd.chuDe, ten: name, kenh: sh.kenh, dangBai: sh.dangBai, caCa, batDau: bd, ketThuc: kt, soLuong: slv || '' }));
  closeModal(); commit(ops, 'Đã lưu việc');
}


/* ---------- Việc của tôi: sửa phần của mình ---------- */
function myModal(id, pre){
  const v = vById(id); if (!v) return;
  const p = pre || {};
  const caCa = p.caCa != null ? p.caCa === '1' : ((v.caCa === '1' || !v.batDau) && !v.gap);
  const bd = p.bd != null ? p.bd : v.batDau, kt = p.kt != null ? p.kt : v.ketThuc;
  window._my = { id, force: false };
  openModal(`<h2>🕘 Đổi giờ: ${esc(v.viec)}</h2><div class="hint" style="margin:-6px 0 10px">Chỉ đổi giờ phần của bạn. Người khác và các việc khác giữ nguyên giờ.</div>
    <div class="f"><label class="chk"><input type="checkbox" id="m_caca" ${caCa ? 'checked' : ''} ${v.gap ? 'disabled' : ''}> Không cố định giờ (cả ca)</label></div>
    <div class="r2" id="m_times"><div class="f"><label>Bắt đầu</label><select id="m_bd">${tOpts(bd)}</select></div><div class="f"><label>Kết thúc</label><select id="m_kt">${tOpts(kt)}</select></div></div>
    <div id="m_warn"></div>
    <div class="mfoot"><button class="btn" data-act="close">Huỷ</button><button class="btn pri" data-act="savemy">Lưu</button></div>`);
  const tg = () => { $('m_times').style.display = $('m_caca').checked ? 'none' : ''; }; tg();
  $('m_caca').addEventListener('change', tg);
  ['m_bd','m_kt'].forEach(x => $(x).addEventListener('change', () => { window._my.force = false; $('m_warn').innerHTML = ''; }));
}

function saveMy(){
  const st = window._my, v = vById(st.id); if (!v) return closeModal();
  const caCa = $('m_caca').checked && !v.gap ? '1' : '', bd = caCa ? '' : $('m_bd').value, kt = caCa ? '' : $('m_kt').value;
  if (!caCa && !bd) return toast('Chọn giờ bắt đầu, hoặc tick "Không cố định giờ"', true);
  if (badEnd(bd, kt)) return toast('Giờ kết thúc phải sau giờ bắt đầu', true);
  if (!st.force) { const ov = overlaps([v.nguoi], caCa, bd, kt, gkey(v)); if (ov.length) { $('m_warn').innerHTML = `<div class="warnbox">⚠️ Trùng giờ với: ${ov.map(x => `<b>${esc(x.viec)}</b> (${esc(timeLb(x))})`).join(', ')}<div class="bar"><button class="btn sm" data-act="myforce">Vẫn lưu</button><button class="btn sm pri" data-act="myfix">Sửa giờ</button></div></div>`; return; } }
  closeModal(); commit([sv('viec', Object.assign({}, v, { caCa, batDau: bd, ketThuc: kt }))], `Đã đổi giờ: ${v.viec} → ${caCa ? 'cả ca' : bd + (kt ? '–' + kt : '')}`);
}
function myDropTarget(e){
  const el = e.target.closest && e.target.closest('[data-dgm],[data-dzm]'); if (!el) return null;
  if (el.dataset.dzm) return { el, zone: el.dataset.dzm, pos: 'in' };
  if (el.dataset.dgm === DRAG2) return null;
  const r = el.getBoundingClientRect();
  return { el, id: el.dataset.dgm, pos: e.clientY < r.top + r.height / 2 ? 'before' : 'after' };
}
function myDrop(id, t){
  const v = vById(id); if (!v) return;
  const [s0, e0] = span(v), full0 = (v.caCa === '1' || !v.batDau) && !v.gap, dur = full0 ? 30 : Math.max(5, e0 - s0);
  let pre;
  if (t.zone === 'full') pre = { caCa: '1' };
  else if (t.zone === 'timed') { const s = CA[S.ca].s; pre = { caCa: '', bd: hhmm(s), kt: hhmm(s + dur) }; }
  else {
    const r = vById(t.id); if (!r) return;
    if ((r.caCa === '1' || !r.batDau) && !r.gap) pre = { caCa: '1' };
    else { const [rs, re] = span(r); let s = t.pos === 'after' ? re : rs - dur; s = Math.round(s / 5) * 5; pre = { caCa: '', bd: hhmm(s), kt: hhmm(s + dur) }; }
  }
  myModal(id, pre);
}

/* ---------- ⚡ Việc gấp ---------- */
function gapModal(){
  const myM = myMangs(cfg.me), m0 = myM[0] || 'Shopee';
  openModal(`<h2>⚡ Việc gấp · đã đăng xong, ghi lại</h2><div class="hint" style="margin:-6px 0 10px">Giờ đăng tự lấy lúc bấm Lưu (${nowHHMM()}).</div>
    <div class="r2"><div class="f"><label>Mảng</label><select id="g_mang">${MANG.map(m => `<option ${m === m0 ? 'selected' : ''}>${m}</option>`).join('')}</select></div><div class="f"><label>Chủ đề</label><select id="g_cd"></select></div></div>
    <div class="f"><label>Nội dung ngắn</label><input id="g_ten" placeholder="vd: Mã VIP 25% tối đa 2tr có sẵn ví"></div>
    <div class="f"><label>Kênh đã đăng</label>${picks('gkenh', S.danhMuc.kenh, 'App Deal hot')}</div>
    <div class="r2"><div class="f"><label>Dạng bài</label><select id="g_dang">${S.danhMuc.dangBai.map(d => `<option>${esc(d)}</option>`).join('')}</select></div><div class="f"><label>Link bài</label><input id="g_link" placeholder="dán link…"></div></div>
    <div class="mfoot"><button class="btn" data-act="close">Huỷ</button><button class="btn pri" data-act="savegap">Lưu</button></div>`);
  const fill = () => { const m = $('g_mang').value; const l = cdsOf(S.date, S.ca).filter(c => c.mang === m); $('g_cd').innerHTML = l.map(c => `<option value="${c.id}">${esc((cdNhom(c) ? cdNhom(c) + ' · ' : '') + c.chuDe)}</option>`).join('') + '<option value="__gap">⚡ Việc gấp khác</option>'; };
  fill(); $('g_mang').addEventListener('change', fill);
}
function saveGap(){
  const link = $('g_link').value.trim(); if (!link) return toast('Dán link bài đã đăng', true);
  const kenh = readPicks('gkenh'); if (!kenh) return toast('Chọn kênh đã đăng', true);
  const m = $('g_mang').value, ops = [];
  let cd = cdById($('g_cd').value);
  if (!cd) {
    const nhom = NHOM_MANG[m] ? (m === 'Social' ? kenhNhom(arr(kenh)[0]) : 'Hằng ngày') : '';
    cd = cdsOf(S.date, S.ca).find(c => c.mang === m && c.chuDe === '⚡ Việc gấp' && cdNhom(c) === nhom);
    if (!cd) { cd = { id: uid('cd'), ngay: S.date, ca: S.ca, mang: m, nhom, chuDe: '⚡ Việc gấp', nguoi: '', kenhCan: '', ghiChu: '', thuTu: String(cdsOf(S.date, S.ca).reduce((mx, c) => Math.max(mx, num(c.thuTu)), 0) + 1) }; ops.push(sv('chude', cd)); }
  }
  const dang = $('g_dang').value, t = nowHHMM();
  const v = newTask({ ngay: S.date, ca: S.ca, cd, nguoi: cfg.me, viec: $('g_ten').value.trim() || 'Việc gấp', batDau: t, kenh, dangBai: dang, soLuong: '1', gap: '1', trangThai: 'Xong', thuTu: groupsOfCd(cd.id).length + 1 });
  ops.push(sv('viec', v));
  ops.push(sv('bai', { id: uid('b'), viecId: v.id, stt: '1', ngay: S.date, ca: S.ca, mang: m, chuDeTen: cd.chuDe, nguoi: cfg.me, kenh: arr(kenh)[0], dangBai: dang, idea: '', link, tgDang: nowDT(), tiepCan: '', thich: '', binhLuan: '', tgDien: '' }));
  closeModal(); commit(ops, '⚡ Đã ghi việc gấp');
}

/* ---------- 📊 Điền số liệu cuối ca ---------- */
function metricsModal(){
  const mine = slotTasks().filter(v => v.nguoi === cfg.me);
  const ids = new Set(mine.map(v => v.id));
  const ps = S.bai.filter(b => ids.has(b.viecId) && b.link).sort((a, b) => String(a.tgDang).localeCompare(String(b.tgDang)));
  const n = new Date();
  openModal(`<h2>📊 Điền số liệu · ${CA[S.ca].lb} ${esc(fmtD(S.date))}</h2>
    <div class="bar" style="background:var(--soft);padding:8px 10px;border-radius:10px"><b>Thời điểm điền:</b><input type="date" id="mt_d" class="btn" value="${realDate()}"><input type="time" id="mt_t" class="btn" value="${p2(n.getHours())}:${p2(n.getMinutes())}"><span class="hint">Chỉ điền bài muốn cập nhật, rồi bấm Đồng bộ thời gian.</span></div>
    ${ps.length ? `<div class="tbl" style="max-height:55vh;overflow:auto"><table><tr><th>#</th><th>Việc</th><th>Kênh</th><th>Đăng lúc</th><th>Tiếp cận</th><th>Thích</th><th>Bình luận</th><th>Điền lúc</th></tr>${ps.map((b, i) => { const v = bInfo(b); return `<tr data-bid="${b.id}"><td>${i + 1}</td><td>${v.gap ? '⚡ ' : ''}<b>${esc(v.viec)}</b><div class="hint">${esc(v.mang)}${b.idea ? ' · ' + esc(b.idea) : ''}</div></td><td>${esc(b.kenh)}</td><td>${esc(dtShow(b.tgDang, b.ngay))}</td>
      ${['tiepCan','thich','binhLuan'].map(f => `<td><input class="btn" style="width:90px;font-weight:400;cursor:text" inputmode="numeric" data-m="${f}" value="${esc(b[f])}"></td>`).join('')}<td class="hint">${esc(b.tgDien ? dtShow(b.tgDien, '') : '—')}</td></tr>`; }).join('')}</table></div>` : '<div class="empty">Bạn chưa có bài nào có link trong ca này.</div>'}
    <div class="mfoot"><button class="btn" data-act="close">Đóng</button>${ps.length ? '<button class="btn pri" data-act="syncmetrics">🔄 Đồng bộ thời gian</button>' : ''}</div>`, true);
}
function syncMetrics(){
  const d = $('mt_d').value, t = $('mt_t').value; if (!d || !t) return toast('Chọn ngày giờ điền', true);
  const ops = [];
  document.querySelectorAll('#sheet tr.dirty').forEach(tr => {
    const b = S.bai.find(x => x.id === tr.dataset.bid); if (!b) return;
    const nb = Object.assign({}, b, { tgDien: d + ' ' + t });
    tr.querySelectorAll('[data-m]').forEach(inp => nb[inp.dataset.m] = inp.value.trim());
    ops.push(sv('bai', nb));
  });
  if (!ops.length) return toast('Chưa sửa số liệu bài nào', true);
  closeModal(); commit(ops, `Đã đồng bộ ${ops.length} bài lúc ${t} ${d.slice(8,10)}/${d.slice(5,7)}`);
}

/* ---------- Trì hoãn ---------- */
function delayModal(v){
  const nx = nextSlot(v.ngay, v.ca);
  openModal(`<h2>⏸ Trì hoãn: ${esc(v.viec)}</h2>
    <div class="f"><label>Lý do</label><select id="d_ly">${S.danhMuc.lyDo.map(x => `<option>${esc(x)}</option>`).join('')}</select><input id="d_ly2" placeholder="Ghi thêm (không bắt buộc)" style="margin-top:6px"></div>
    <div class="f"><label>Dời sang</label><select id="d_to"><option value="next">${nx.ca === 'Tối' ? 'Ca tối nay' : 'Ca sáng ngày mai'} (${esc(fmtD(nx.ngay))})</option><option value="tomorrow">Ngày mai – ca sáng</option><option value="pick">Chọn ngày…</option></select></div>
    <div class="r2" id="d_pickwrap" style="display:none"><div class="f"><label>Ngày</label><input type="date" id="d_day" value="${addDays(v.ngay, 1)}"></div><div class="f"><label>Ca</label><select id="d_ca"><option>Sáng</option><option>Tối</option></select></div></div>
    <div class="hint">Bài đã đăng giữ lại tính cho ca này. Bài chưa đăng (kèm idea) đi theo việc sang ca sau.</div>
    <div class="mfoot"><button class="btn" data-act="close">Huỷ</button><button class="btn pri" data-act="savedelay" data-id="${esc(v.id)}">Xác nhận trì hoãn</button></div>`);
  $('d_to').addEventListener('change', () => { $('d_pickwrap').style.display = $('d_to').value === 'pick' ? '' : 'none'; });
}
function delayTarget(v, mode, day, ca){
  if (mode === 'next') return nextSlot(v.ngay, v.ca);
  if (mode === 'tomorrow') return { ngay: addDays(v.ngay, 1), ca: 'Sáng' };
  return { ngay: day, ca };
}
function saveDelay(id){
  const v = vById(id); if (!v) return closeModal();
  const t = delayTarget(v, $('d_to').value, $('d_day').value, $('d_ca').value);
  const ly = $('d_ly').value + ($('d_ly2').value.trim() ? ': ' + $('d_ly2').value.trim() : '');
  closeModal(); commit([sv('viec', Object.assign({}, v, { trangThai: 'Trì hoãn', lyDo: ly, doiNgay: t.ngay, doiCa: t.ca }))], `Đã trì hoãn sang ${fmtD(t.ngay)} ca ${t.ca.toLowerCase()}`);
}

/* ---------- Dán mẫu ---------- */
function pasteModal(){
  const blocks = blockList();
  if (!blocks.length) return toast('Chưa có khối mẫu. Vào Cài đặt để đưa mẫu lên, hoặc lưu một nhóm / mảng thành khối mẫu.', true);
  const isWed = wd(S.date) === 3;
  openModal(`<h2>📋 Dán mẫu vào ${CA[S.ca].lb} · ${esc(fmtD(S.date))}</h2>
    <div class="hint" style="margin-bottom:10px">Chủ đề đã có trong ca sẽ được bỏ qua, không tạo trùng. Người lấy theo Phân công mảng.</div>
    ${MANG.map(m => { const bl = blocks.filter(b => b.mang === m); if (!bl.length) return ''; return `<div class="brow" style="${mcStyle(m)}"><div class="bm">${esc(m)}</div><div class="blocks">${bl.map(b => { const on = isDailyBlock(b.mang, b.khoi) || (isWed && /thứ 4/i.test(b.khoi)); const n = S.mau.filter(x => bkey(x) === b.key).length;
      return `<label class="blk chk" style="align-items:flex-start"><input type="checkbox" data-blk="${esc(b.key)}" ${on ? 'checked' : ''}><span><b>${esc(b.khoi)}</b><br><span class="hint">${n} chủ đề</span></span></label>`; }).join('')}</div></div>`; }).join('')}
    <div class="mfoot"><button class="btn" data-act="close">Huỷ</button><button class="btn pri" data-act="dopaste">Dán mẫu</button></div>`, true);
}
function doPaste(){
  const keys = [...document.querySelectorAll('[data-blk]:checked')].map(x => x.dataset.blk);
  if (!keys.length) return toast('Chọn ít nhất một khối', true);
  const r = buildPaste({ chuDe: S.chuDe, mau: S.mau, macDinh: S.macDinh }, keys, S.date, S.ca);
  closeModal();
  if (!r.cds.length) return toast('Các chủ đề trong mẫu đã có sẵn');
  commit([...r.cds.map(c => sv('chude', c)), ...r.tasks.map(t => sv('viec', t))], `Đã dán ${r.cds.length} chủ đề, ${r.tasks.length} việc nhỏ`);
}

/* ---------- Lưu khối mẫu (theo nhóm / mảng) ---------- */
function saveBlockFor(m, nhom){
  const cds = cdsOf(S.date, S.ca).filter(c => c.mang === m && (!NHOM_MANG[m] || cdNhom(c) === nhom) && c.chuDe !== '⚡ Việc gấp');
  if (!cds.length) return toast('Chưa có chủ đề để lưu', true);
  const name = NHOM_MANG[m] ? nhom : ((blockList().find(b => b.mang === m) || {}).khoi || `${m} hằng ngày`);
  const exists = S.mau.some(x => x.mang === m && x.khoi === name);
  const go = () => {
    const old = S.mau.filter(x => x.mang === m && x.khoi === name);
    const ops = old.map(x => dl('mau', x.id));
    const base = S.mau.reduce((mx, x) => Math.max(mx, num(x.thuTu)), 0) + 1;
    // Việc có giờ thuộc ca khác (vd khung 18H khi lưu từ ca sáng) không có trên cây ca này → giữ lại từ khối cũ
    const otherCa = t => !t.caCa && mins(t.batDau) != null && !inCa(S.ca, t.batDau);
    cds.forEach((c, i) => {
      const vs = groupsOfCd(c.id).filter(g => !g[0].gap && g.some(v => v.trangThai !== 'Bỏ')).map(g => { const v = g[0]; return { viec: v.viec, caCa: v.caCa, batDau: v.batDau, ketThuc: v.ketThuc, kenh: v.kenh, dangBai: v.dangBai, soLuong: v.soLuong !== '' ? v.soLuong : (v.goiY || '') }; });
      old.filter(o => o.chuDe === c.chuDe).forEach(o => jparse(o.viecJson).filter(otherCa).forEach(t => { if (!vs.some(x => x.viec === t.viec)) vs.push(t); }));
      ops.push(sv('mau', { id: uid('mau'), khoi: name, mang: m, nhom: NHOM_MANG[m] ? nhom : '', thuTu: String(base + i), chuDe: c.chuDe, kenhCan: c.kenhCan, ghiChu: c.ghiChu, viecJson: JSON.stringify(vs) }));
    });
    // Chủ đề trong khối chỉ có việc của ca khác (không dán vào ca này) → giữ nguyên
    old.filter(o => !cds.some(c => c.chuDe === o.chuDe) && jparse(o.viecJson).length && jparse(o.viecJson).every(otherCa)).forEach((o, j) => ops.push(sv('mau', Object.assign({}, o, { id: uid('mau'), thuTu: String(base + cds.length + j) }))));
    commit(ops, `Đã lưu khối "${name}"`);
  };
  if (exists) confirmModal('💾 Ghi đè khối mẫu?', `Đã có khối <b>${esc(name)}</b> (${esc(m)}). Ghi đè bằng ${cds.length} chủ đề hiện tại trên cây? Việc có giờ của ca khác trong khối (vd khung 18H) vẫn được giữ.`, 'Ghi đè', go);
  else go();
}

/* ---------- 👥 Phân công (từ cây) ---------- */
function pcModal(){
  openModal(`<h2>👥 Đổi người ca này · ${CA[S.ca].lb} ${esc(fmtD(S.date))}</h2><div class="hint" style="margin-bottom:8px">Dùng khi cần đổi người giữa ca (vd có người nghỉ đột xuất). Chọn người cho từng mảng (chọn được nhiều người), rồi bấm Cập nhật để áp vào cây ca này. Bảng này cũng là mặc định cho các ngày sau.</div>
    ${pcTable([S.ca])}
    <div class="mfoot"><button class="btn" data-act="close">Đóng</button><button class="btn pri" data-act="pcapply">🔄 Cập nhật phân công vào cây</button></div>`, true);
}

/* ---------- 🔄 Bàn giao ca tối ---------- */
// Việc nhỏ chép sang ca tối cho 1 chủ đề ca sáng: việc cả ca + việc có giờ trong ca tối; lấy thêm việc giờ tối từ khối mẫu (vd Post Xtra khung 18H)
const inCa = (ca, t) => { const st = mins(t); return st != null && st >= CA[ca].s && st < CA[ca].e; };
function eveTasksFor(c){
  const out = [];
  groupsOfCd(c.id).forEach(g => { const v = g[0]; if (v.gap) return;
    const full = v.caCa === '1' || !v.batDau;
    if (full || inCa('Tối', v.batDau)) out.push({ viec: v.viec, caCa: full ? '1' : '', batDau: full ? '' : v.batDau, ketThuc: full ? '' : v.ketThuc, kenh: v.kenh, dangBai: v.dangBai, soLuong: v.soLuong, ghiChu: v.ghiChu, thuTu: v.thuTu }); });
  S.mau.filter(m => m.mang === c.mang && m.chuDe === c.chuDe).forEach(m => jparse(m.viecJson).forEach((t, i) => {
    if (t.caCa || !inCa('Tối', t.batDau) || out.some(x => x.viec === t.viec)) return;
    out.push({ viec: t.viec, caCa: '', batDau: t.batDau, ketThuc: t.ketThuc, kenh: t.kenh, dangBai: t.dangBai, soLuong: String(t.soLuong) === '0' ? '0' : String(num(t.soLuong) || 1), ghiChu: '', thuTu: String(100 + i) }); }));
  return out;
}
function handoverModal(){
  const cds = cdsOf(S.date, 'Sáng').filter(c => c.chuDe !== '⚡ Việc gấp');
  const eve = cdsOf(S.date, 'Tối');
  let h = '';
  MANG.forEach((m, mi) => {
    const list = cds.filter(c => c.mang === m); if (!list.length) return;
    h += `<label class="hm" style="${mcStyle(m)}"><input type="checkbox" data-hk="m${mi}"><span style="color:var(--mc)">${esc(m)}</span><span class="hint">${list.length} chủ đề</span></label>`;
    const groups = NHOM_MANG[m] ? nhomsOf(m, list).filter(g => list.some(c => cdNhom(c) === g)) : [''];
    groups.forEach((g, gi) => {
      const gl = list.filter(c => !g || cdNhom(c) === g), gk = `g${mi}_${gi}`;
      if (g) h += `<label class="hg"><input type="checkbox" data-hk="${gk}" data-hp="m${mi}">${esc(g)}<span class="hint">${gl.length} chủ đề</span></label>`;
      gl.forEach(c => {
        const has = eve.some(e => e.mang === c.mang && e.chuDe === c.chuDe), n = eveTasksFor(c).length, morningOnly = !n && groupsOfCd(c.id).some(gr => !gr[0].gap);
        h += `<label class="hc" ${g ? '' : 'style="margin-left:24px"'}><input type="checkbox" data-hc="${c.id}" data-hp="${g ? gk : 'm' + mi}" ${has || morningOnly ? '' : 'checked'}>${esc(c.chuDe)}<span class="hint">${morningOnly ? 'chỉ có việc giờ buổi sáng' : n + ' việc nhỏ cho ca tối'}${has ? ' · ca tối đã có chủ đề này' : ''}</span></label>`;
      });
    });
  });
  openModal(`<h2>🔄 Bàn giao ca tối · ${esc(fmtD(S.date))}</h2>
    <h3 style="font-size:14px">1. Chép việc sang ca tối</h3>
    <div class="hint" style="margin-bottom:6px">Tick mảng hoặc nhóm là tick hết chủ đề bên trong. Chủ đề được chép kèm việc nhỏ của ca tối: việc cả ca và việc có giờ trong ca tối (lấy thêm từ khối mẫu, vd khung 18H). Việc giờ buổi sáng không chép. Không chép idea, link, tình trạng.</div>
    <div class="hotree card" style="max-height:330px;overflow:auto;padding:6px 12px">${h || '<div class="hint">Ca sáng chưa có chủ đề.</div>'}</div>
    <h3 style="font-size:14px;margin-top:14px">2. Phân công ca tối</h3>
    <div class="hint" style="margin-bottom:6px">Lấy theo <b>Cài đặt › Phân công mảng › Ca tối</b>. Đổi ở đây thì bảng trong Cài đặt cũng đổi theo khi bấm Bàn giao. Mảng 1 người: tên tự điền xuống chủ đề và việc nhỏ. Mảng nhiều người: chủ đề để leader phân.</div>
    <div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px">${MANG.map(m => `<div class="f" style="${mcStyle(m)}"><label style="color:var(--mc);font-weight:800">${esc(m)}</label>${msel('ho|' + m, names(), pcPeople(S.macDinh, 'Tối', m), 'Chưa có')}</div>`).join('')}</div>
    <div class="mfoot"><button class="btn" data-act="close">Huỷ</button><button class="btn pri" data-act="dohandover">Bàn giao</button></div>`, true);
  hoRefresh();
}
function hoSet(key, on){ document.querySelectorAll(`#sheet [data-hp="${key}"]`).forEach(x => { x.checked = on; x.indeterminate = false; if (x.dataset.hk) hoSet(x.dataset.hk, on); }); }
function hoRefresh(){
  ['g','m'].forEach(pref => document.querySelectorAll(`#sheet [data-hk^="${pref}"]`).forEach(p => {
    const ch = [...document.querySelectorAll(`#sheet [data-hp="${p.dataset.hk}"]`)];
    const full = ch.filter(x => x.checked && !x.indeterminate).length, part = ch.some(x => x.indeterminate || x.checked);
    p.checked = ch.length > 0 && full === ch.length; p.indeterminate = !p.checked && part;
  }));
}

function doHandover(){
  closeMsels();
  const ops = [], P = {};
  MANG.forEach(m => { P[m] = readMsel('ho|' + m); if (P[m].join(', ') !== pcPeople(S.macDinh, 'Tối', m).join(', ')) ops.push(macDinhOp('Tối', m, P[m].join(', '))); });
  const ids = [...document.querySelectorAll('#sheet [data-hc]:checked')].map(x => x.dataset.hc);
  const eve = cdsOf(S.date, 'Tối'); let order = eve.reduce((mx, c) => Math.max(mx, num(c.thuTu)), 0) + 1, nc = 0, nt = 0;
  ids.forEach(id => {
    const c = cdById(id); if (!c) return;
    const p = P[c.mang] || [], who = p.length === 1 ? p[0] : '';
    let cd = eve.find(e => e.mang === c.mang && e.chuDe === c.chuDe);
    if (!cd) { cd = Object.assign({}, c, { id: uid('cd'), ca: 'Tối', nguoi: who, thuTu: String(order++) }); ops.push(sv('chude', cd)); nc++; }
    eveTasksFor(c).forEach(v => {
      ops.push(sv('viec', newTask({ ngay: S.date, ca: 'Tối', cd, nguoi: who, viec: v.viec, caCa: v.caCa, batDau: v.batDau, ketThuc: v.ketThuc, kenh: v.kenh, dangBai: v.dangBai, soLuong: v.soLuong, ghiChu: v.ghiChu, thuTu: v.thuTu }))); nt++;
    });
  });
  if (!ops.length) return toast('Chưa chọn chủ đề nào để chép', true);
  closeModal(); S.ca = 'Tối'; commit(ops, `Đã bàn giao: ${nc} chủ đề, ${nt} việc nhỏ sang ca tối`);
}

/* ---------- Nhân bản & xoá ---------- */
function dupGroup(key){
  if (!canWrite()) return;
  const g = S.viec.filter(v => gkey(v) === key && v.trangThai !== 'Đã chuyển'); if (!g.length) return;
  const nk = uid('g');
  const ops = g.map(v => sv('viec', Object.assign({}, v, { id: uid('v'), nhomViec: nk, gap: '', trangThai: 'Chưa làm', lyDo: '', doiNgay: '', doiCa: '', goc: '', lichSu: '', thuTu: String(ordKey(v) === 1e9 ? '' : num(v.thuTu) + 0.5) })));
  commit(ops).then(() => vModal(nk));
}
function dupCd(id){
  if (!canWrite()) return;
  const c = cdById(id); if (!c) return;
  const nc = Object.assign({}, c, { id: uid('cd'), chuDe: c.chuDe + ' (bản sao)', thuTu: String(num(c.thuTu) + 0.5) });
  const ops = [sv('chude', nc)];
  groupsOfCd(id).forEach(g => { const nk = uid('g'); g.filter(v => v.trangThai !== 'Đã chuyển').forEach(v => ops.push(sv('viec', Object.assign({}, v, { id: uid('v'), nhomViec: nk, chuDeId: nc.id, chuDeTen: nc.chuDe, gap: '', trangThai: 'Chưa làm', lyDo: '', doiNgay: '', doiCa: '', goc: '', lichSu: '' })))); });
  commit(ops).then(() => cdModal(nc.id));
}
function delWithUndo(items, label){
  if (!canWrite()) return;
  commit(items.map(x => dl(x.type, x.obj.id)));
  toast(`Đã xoá ${label}`, false, 'Hoàn tác', () => commit(items.map(x => sv(x.type, x.obj)), 'Đã khôi phục'));
}
const taskItems = v => [{ type: 'viec', obj: v }, ...postsOf(v.id).map(b => ({ type: 'bai', obj: b }))];
function delGroup(key){ const g = S.viec.filter(v => gkey(v) === key); if (g.length) delWithUndo(g.flatMap(taskItems), 'việc'); }
function delMine(id){ const v = vById(id); if (v) delWithUndo(taskItems(v), 'việc của bạn'); }
function delCd(id){ const c = cdById(id); if (!c) return; const ts = S.viec.filter(v => v.chuDeId === id); delWithUndo([{ type: 'chude', obj: c }, ...ts.flatMap(taskItems)], `chủ đề và ${ts.length} việc`); }
function libDel(ref){
  const [t, a, b] = ref.split(':');
  if (t === 'tv') { const x = S.thuVien.find(y => y.id === a); if (x) delWithUndo([{ type: 'thuvien', obj: x }], 'mục'); return; }
  const m = S.mau.find(y => y.id === a); if (!m) return;
  if (t === 'mc') return confirmModal('🗑 Xoá chủ đề khỏi khối mẫu?', `Chủ đề <b>${esc(m.chuDe)}</b> nằm trong khối <b>${esc(m.khoi)}</b> (${esc(m.mang)}), kèm ${jparse(m.viecJson).length} việc nhỏ. Xoá khỏi khối luôn?`, 'Xoá', () => delWithUndo([{ type: 'mau', obj: m }], 'chủ đề khỏi khối'));
  const vs = jparse(m.viecJson), i = +b, it = vs[i]; if (!it) return;
  confirmModal('🗑 Xoá việc khỏi khối mẫu?', `Việc <b>${esc(it.viec)}</b> nằm trong khối <b>${esc(m.khoi)}</b> (${esc(m.mang)} · ${esc(m.chuDe)}). Xoá khỏi khối luôn? Lần dán mẫu sau sẽ không còn việc này.`, 'Xoá', () => {
    if (!canWrite()) return;
    const nm = Object.assign({}, m, { viecJson: JSON.stringify(vs.filter((_, j) => j !== i)) });
    commit([sv('mau', nm)]); toast('Đã xoá việc khỏi khối', false, 'Hoàn tác', () => commit([sv('mau', m)], 'Đã khôi phục'));
  });
}

