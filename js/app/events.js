/* =====================================================================
   SỰ KIỆN
   ===================================================================== */
document.addEventListener('mousedown', e => { const ci = e.target.closest('.ci'); if (ci && ci.dataset.ckey) { e.preventDefault(); comboPick(ci.closest('.combo').id, ci.dataset.ckey); } });
document.addEventListener('focusin', e => { const t = e.target; if (t.classList && t.classList.contains('combo-in')) { const c = t.closest('.combo'); c.classList.add('open'); comboRender(c.id); } });
document.addEventListener('input', e => {
  const t = e.target;
  if (t.classList.contains('combo-in')) { const c = t.closest('.combo'); c.classList.add('open'); comboRender(c.id); if (COMBO[c.id] && COMBO[c.id].onType) COMBO[c.id].onType(); return; }
  if (t.id === 'libq' || t.id === 'libm') { filterLib(); return; }
  if (t.dataset.m) { const tr = t.closest('tr'); if (tr) tr.classList.add('dirty'); }
});
function filterLib(){ const q = norm($('libq').value).trim(), m = $('libm').value; document.querySelectorAll('.lrow').forEach(r => { r.style.display = (!q || r.dataset.txt.includes(q)) && (!m || r.dataset.m === m) ? '' : 'none'; }); }
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.dataset && e.target.dataset.enter === 'savelink1') { e.preventDefault(); saveLink1(e.target.dataset.id); return; }
  if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('combo-in')) { e.preventDefault(); const c = e.target.closest('.combo'); const first = c.querySelector('.ci'); if (first) comboPick(c.id, first.dataset.ckey); return; }
  if (e.key === 'Escape') { closeModal(); closeMenu(); closeMsels(); }
});
document.addEventListener('click', e => {
  const t = e.target;
  if (!t.closest('#menu') && !t.closest('.dots') && !t.closest('[data-act="postpop"],[data-act="dangpop"],[data-act="gpop"],[data-act="gpopfull"],[data-act="misspop"]')) closeMenu();
  if (!t.closest('.msel')) closeMsels();
  if (!t.closest('.combo')) document.querySelectorAll('.combo.open').forEach(c => c.classList.remove('open'));
  const pk = t.closest('.pick'); if (pk) { pk.classList.toggle('on'); return; }
  const tab = t.closest('#tabs button'); if (tab) { S.tab = tab.dataset.tab; ensureLoaded(); return; }
  if (t.id === 'modal') { closeModal(); return; }
  const el = t.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act;
  if (el.closest('#menu')) closeMenu();
  switch (a) {
    case 'day': S.date = addDays(S.date, +el.dataset.d); load(); break;
    case 'today': S.date = workday(); S.ca = curCa(); load(); break;
    case 'ca': S.ca = el.dataset.v; render(); break;
    case 'td': S.td = el.dataset.v; ensureLoaded(); break;
    case 'tdmore': S.tdMore = !S.tdMore; render(); break;
    case 'close': closeModal(); break;
    case 'cfok': { const fn = window._cf; closeModal(); if (fn) fn(); break; }
    case 'fold': { const k = el.dataset.k; S.fold.has(k) ? S.fold.delete(k) : S.fold.add(k); ls.set(FOLD_KEY, [...S.fold]); render(); break; }
    case 'mselopen': { const ms = el.closest('.msel'); const open = !ms.classList.contains('open'); closeMsels(ms); ms.classList.toggle('open', open); if (open) { const r = el.getBoundingClientRect(), pop = ms.querySelector('.msel-pop'); pop.style.minWidth = Math.max(200, r.width) + 'px'; pop.style.left = Math.min(r.left, window.innerWidth - Math.max(200, r.width) - 8) + 'px'; const below = r.bottom + 4; pop.style.top = (below + 290 > window.innerHeight ? Math.max(8, r.top - Math.min(290, pop.scrollHeight) - 4) : below) + 'px'; } break; }
    case 'newcd': cdModal('', el.dataset.m || '', el.dataset.nhom || ''); break;
    case 'newnhom': cdModal('', el.dataset.m, '__new'); break;
    case 'savecd': saveCd(); break;
    case 'newv': vModal('', el.dataset.cd || ''); break;
    case 'editv': vModal(el.dataset.key); break;
    case 'savev': saveV(); break;
    case 'saveforce': window._vm.force = true; saveV(); break;
    case 'fixtime': $('v_warn').innerHTML = ''; window._vm.force = false; $('v_bd').focus(); break;
    case 'slok': window._vm.slOk = true; window._vm.force = true; saveV(); break;
    case 'savemy': saveMy(); break;
    case 'myforce': window._my.force = true; saveMy(); break;
    case 'myfix': $('m_warn').innerHTML = ''; $('m_bd').focus(); break;
    case 'doing': { const v = vById(el.dataset.id); if (v) commit([sv('viec', Object.assign({}, v, { trangThai: v.trangThai === 'Đang làm' ? 'Chưa làm' : 'Đang làm' }))], v.trangThai === 'Đang làm' ? '' : '▶ Đang làm: ' + v.viec); break; }
    case 'nolink1': saveLink1(el.dataset.id, true); break;
    case 'deltd': delPending(el.dataset.id); break;
    case 'misspop': openPop(el, missPopHtml(el.dataset.p, el.dataset.k)); break;
    case 'misscopy': copyText(missCopyText()); break;
    case 'gpop': { const v = vById(el.dataset.id); if (v) openPop(el, taskPopHtml(v)); break; }
    case 'gpopfull': { const ts = slotTasksFor(el.dataset.p, el.dataset.ca); openPop(el, `<b>${esc(el.dataset.p)} · việc cả ${esc(CA[el.dataset.ca].lb.toLowerCase())}</b>` + ts.map(v => `<div>${ST[stOf(v)].ic} ${esc(v.viec)} <span class="hint">· ${esc(v.mang)} · ${esc(v.chuDeTen)}${sl(v) ? ` · ${linksOf(v.id)}/${sl(v)} bài` : ''}</span></div>`).join('')); break; }
    case 'savedelay': saveDelay(el.dataset.id); break;
    case 'paste': pasteModal(); break;
    case 'dopaste': doPaste(); break;
    case 'pcmodal': pcModal(); break;
    case 'pcapply': { closeMsels(); const ops = phanCongOps(S.date, S.ca); closeModal(); commit(ops, ops.length ? `Đã cập nhật phân công vào cây (${ops.length} thay đổi)` : 'Cây đã khớp phân công, không có gì đổi'); break; }
    case 'handover': handoverModal(); break;
    case 'dohandover': doHandover(); break;
    case 'gapmodal': gapModal(); break;
    case 'savegap': saveGap(); break;
    case 'metrics': metricsModal(); break;
    case 'syncmetrics': syncMetrics(); break;
    case 'claimfree': { const v = vById(el.dataset.id); if (v) commit([sv('viec', Object.assign({}, v, { nguoi: cfg.me }))], 'Đã nhận việc: ' + v.viec); break; }
    case 'tick0': { const v = vById(el.dataset.id); if (v) commit([sv('viec', Object.assign({}, v, { trangThai: v.trangThai === 'Xong' ? 'Chưa làm' : 'Xong' }))], v.trangThai === 'Xong' ? '' : '✅ Xong: ' + v.viec); break; }
    case 'tick1': { const id = el.dataset.id; S.linkOpen.has(id) ? S.linkOpen.delete(id) : S.linkOpen.add(id); render(); const inp = $('lk-' + id); if (inp) inp.focus(); break; }
    case 'savelink1': saveLink1(el.dataset.id); break;
    case 'untick1': { const v = vById(el.dataset.id); const b = postsOf(el.dataset.id).find(x => num(x.stt) === 1); S.linkOpen.delete(el.dataset.id); commit([...(b ? [dl('bai', b.id)] : []), sv('viec', Object.assign({}, v, { trangThai: 'Chưa làm' }))], 'Đã bỏ tick'); break; }
    case 'expand': { const id = el.dataset.id; S.open.has(id) ? S.open.delete(id) : S.open.add(id); render(); break; }
    case 'dangpop': { const v = vById(el.dataset.id); const b = postsOf(v.id).find(x => num(x.stt) === 1); const cur = (b && b.dangBai) || arr(v.dangBai)[0]; const first = arr(v.dangBai); const all = first.concat(S.danhMuc.dangBai.filter(x => !first.includes(x)));
      openMenu(el, all.map(d => ['setdang1', (d === cur ? '✓ ' : '') + esc(d), `data-id="${v.id}" data-v="${esc(d)}"`])); break; }
    case 'setdang1': { const v = vById(el.dataset.id), d = el.dataset.v; const b = postsOf(v.id).find(x => num(x.stt) === 1);
      if (b) commit([sv('bai', Object.assign({}, b, { dangBai: d }))]); else commit([sv('viec', Object.assign({}, v, { dangBai: [d].concat(arr(v.dangBai).filter(x => x !== d)).join(', ') }))]); break; }
    case 'postpop': { const v = vById(el.dataset.id); openPop(el, `<div><b>${esc(v.viec)}</b> · ${pc(v.nguoi)}</div>${postLines(v)}`); break; }
    case 'menu-v': openMenu(el, [['m-editv','✎ Sửa (chung cả nhóm người)',`data-key="${el.dataset.key}"`],['m-dupv','⧉ Nhân bản',`data-key="${el.dataset.key}"`],['m-delv','🗑 Xoá',`data-key="${el.dataset.key}"`,'danger']]); break;
    case 'menu-my': { const v = vById(el.dataset.id); openMenu(el, [['m-myedit','🕘 Đổi giờ',`data-id="${v.id}"`],['m-delmine','🗑 Xoá việc của tôi',`data-id="${v.id}"`,'danger']]); break; }
    case 'menu-cd': openMenu(el, [['m-editcd','✎ Sửa chủ đề',`data-id="${el.dataset.id}"`],['newv','+ Việc nhỏ',`data-cd="${el.dataset.id}"`],['m-dupcd','⧉ Nhân bản kèm việc nhỏ',`data-id="${el.dataset.id}"`],['m-delcd','🗑 Xoá chủ đề',`data-id="${el.dataset.id}"`,'danger']]); break;
    case 'menu-mang': { const m = el.dataset.m; const items = [['newcd','+ Chủ đề',`data-m="${esc(m)}" data-nhom="${esc(defNhom(m))}"`]]; if (NHOM_MANG[m]) items.push(['newnhom','+ Nhóm mới',`data-m="${esc(m)}"`]); if (!NHOM_MANG[m]) items.push(['m-saveblock','💾 Lưu mảng này thành khối mẫu',`data-m="${esc(m)}" data-nhom=""`]); openMenu(el, items); break; }
    case 'menu-nhom': openMenu(el, [['newcd','+ Chủ đề vào nhóm này',`data-m="${esc(el.dataset.m)}" data-nhom="${esc(el.dataset.nhom)}"`],['m-saveblock','💾 Lưu nhóm này thành khối mẫu',`data-m="${esc(el.dataset.m)}" data-nhom="${esc(el.dataset.nhom)}"`]]); break;
    case 'm-editv': vModal(el.dataset.key); break;
    case 'm-dupv': dupGroup(el.dataset.key); break;
    case 'm-delv': delGroup(el.dataset.key); break;
    case 'm-myedit': myModal(el.dataset.id); break;
    case 'm-delay': { const v = vById(el.dataset.id); if (v) delayModal(v); break; }
    case 'm-delmine': delMine(el.dataset.id); break;
    case 'm-editcd': cdModal(el.dataset.id); break;
    case 'editcd': cdModal(el.dataset.id); break;
    case 'm-dupcd': dupCd(el.dataset.id); break;
    case 'm-delcd': delCd(el.dataset.id); break;
    case 'm-saveblock': saveBlockFor(el.dataset.m, el.dataset.nhom); break;
    case 'setme': cfg.me = $('whoSel').value; ls.set(CFG_KEY, cfg); closeModal(); render(); break;
    case 'delblock': { const k = el.dataset.k; const items = S.mau.filter(x => bkey(x) === k).map(x => ({ type: 'mau', obj: x })); confirmModal('🗑 Xoá khối mẫu?', `Xoá khối <b>${esc(k.split('|')[1])}</b> (${items.length} chủ đề)?`, 'Xoá', () => delWithUndo(items, 'khối')); break; }
    case 'renblock': { const k = el.dataset.k, [m, kh] = k.split('|'); window._rb = k;
      openModal(`<h2>Đổi tên khối mẫu</h2><div class="f"><label>Tên mới</label><input id="rb_name" value="${esc(kh)}"></div>${NHOM_MANG[m] ? '<div class="hint">Tên khối cũng là tên nhóm trên cây khi dán mẫu.</div>' : ''}<div class="mfoot"><button class="btn" data-act="close">Huỷ</button><button class="btn pri" data-act="dorenblock">Lưu</button></div>`); break; }
    case 'dorenblock': { const [m] = window._rb.split('|'); const nm = $('rb_name').value.trim(); if (!nm) break; const ops = S.mau.filter(x => bkey(x) === window._rb).map(x => sv('mau', Object.assign({}, x, { khoi: nm, nhom: NHOM_MANG[m] ? nm : x.nhom }))); closeModal(); commit(ops, 'Đã đổi tên khối'); break; }
    case 'libdel': libDel(el.dataset.ref); break;
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'meSel') { cfg.me = t.value; ls.set(CFG_KEY, cfg); render(); return; }
  if (t.id === 'dateInp' && t.value) { S.date = t.value; load(); return; }
  if (t.closest && t.closest('.msel-pop')) {
    const ms = t.closest('.msel'); const all = [...ms.querySelectorAll('input[type=checkbox]')];
    const list = all.filter(x => x.checked).map(x => x.value);
    ms.dataset.val = list.join(', '); ms.dataset.dirty = '1';
    ms.querySelector('.msel-btn').innerHTML = mselLabel(list, ms.dataset.ph); return;
  }
  if (t.dataset.vid && t.dataset.f) { savePostField(t); return; }
  if (t.dataset.hk) { hoSet(t.dataset.hk, t.checked); hoRefresh(); return; }
  if (t.dataset.hc) { hoRefresh(); return; }
});
document.addEventListener('focusout', e => {
  const t = e.target;
  if (t.dataset && t.dataset.f === 'bangiao') saveBanGiao(t.dataset.id, t.value);
});
function saveBanGiao(m, value){
  const old = banGiaoOf(S.date, S.ca, m);
  if ((old ? old.ghiChu : '') === value) return;
  return commit([sv('bangiao', { id: old ? old.id : S.date + '|' + S.ca + '|' + m, ngay: S.date, ca: S.ca, mang: m, ghiChu: value })], 'Đã lưu bàn giao ' + m);
}
document.addEventListener('scroll', ev => { if (ev.target && ev.target.closest && (ev.target.closest('#menu') || ev.target.closest('.msel-pop') || ev.target.closest('.combo-list'))) return; closeMenu(); closeMsels(); }, true);

