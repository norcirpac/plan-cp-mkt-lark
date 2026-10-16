/* =====================================================================
   MENU ⋯ / POPOVER
   ===================================================================== */
function placeMenu(btn){
  const m = document.getElementById('menu'); m.style.display = 'block';
  const r = btn.getBoundingClientRect();
  const left = Math.min(window.innerWidth - m.offsetWidth - 8, r.right - m.offsetWidth + 10);
  m.style.left = Math.max(8, left) + 'px';
  m.style.top = (r.bottom + 4 + m.offsetHeight > window.innerHeight ? Math.max(8, r.top - m.offsetHeight - 4) : r.bottom + 4) + 'px';
}
function openMenu(btn, items){ document.getElementById('menu').innerHTML = items.map(([act, lb, extra, cls]) => `<button data-act="${act}" ${extra || ''} class="${cls || ''}">${lb}</button>`).join(''); placeMenu(btn); }
function openPop(btn, html){ document.getElementById('menu').innerHTML = `<div class="pop">${html}</div>`; placeMenu(btn); }
const closeMenu = () => { document.getElementById('menu').style.display = 'none'; };

/* =====================================================================
   THÀNH PHẦN FORM: chọn nhiều người, ô tìm kiếm
   ===================================================================== */
const $ = id => document.getElementById(id);
const picks = (name, all, sel) => `<div class="picks" data-pick="${name}">${all.map(x => `<button type="button" class="pick ${arr(sel).includes(x) ? 'on' : ''}" data-val="${esc(x)}">${esc(x)}</button>`).join('')}</div>`;
const readPicks = name => [...document.querySelectorAll(`[data-pick="${name}"] .pick.on`)].map(b => b.dataset.val).join(', ');
const setPicks = (name, val) => document.querySelectorAll(`[data-pick="${name}"] .pick`).forEach(b => b.classList.toggle('on', arr(val).includes(b.dataset.val)));
const tOpts = sel => `<option value="">--:--</option>` + TIMES.map(t => `<option ${t === sel ? 'selected' : ''}>${t}</option>`).join('') + (sel && !TIMES.includes(sel) ? `<option selected>${esc(sel)}</option>` : '');
const mselLabel = (s, ph) => s.length ? s.map(pc).join(' ') : `<span class="muted">${esc(ph || 'Chọn người')}</span>`;
function msel(name, all, sel, ph){
  const s = arr(sel);
  return `<div class="msel" data-msel="${esc(name)}" data-val="${esc(s.join(', '))}" data-ph="${esc(ph || '')}"><button type="button" class="msel-btn" data-act="mselopen">${mselLabel(s, ph)}</button><div class="msel-pop">${all.map(x => `<label class="chk mopt"><input type="checkbox" value="${esc(x)}" ${s.includes(x) ? 'checked' : ''}>${pc(x)}</label>`).join('')}</div></div>`;
}
const readMsel = name => { const el = document.querySelector(`[data-msel="${name}"]`); return el ? arr(el.dataset.val) : []; };
function closeMsels(except){
  document.querySelectorAll('.msel.open').forEach(x => { if (x === except) return; x.classList.remove('open'); if (x.dataset.dirty) { delete x.dataset.dirty; onMselDone(x); } });
}
function onMselDone(el){
  const name = el.dataset.msel;
  if (name.startsWith('pc|')) { const [, ca, mang] = name.split('|'); commit([macDinhOp(ca, mang, el.dataset.val)], `Đã lưu phân công ${mang} ${CA[ca].lb.toLowerCase()}`); }
}
const COMBO = {};
const comboHtml = (id, ph, val) => `<div class="combo" id="${id}"><input class="combo-in" id="${id}_in" placeholder="${esc(ph)}" value="${esc(val || '')}" autocomplete="off"><div class="combo-list" id="${id}_list"></div></div>`;
function comboRender(id){
  const c = COMBO[id]; if (!c) return;
  const q = $(id + '_in').value, nq = norm(q).trim();
  const all = c.items(q), items = all.filter(it => !nq || norm(it.label).includes(nq));
  let h = '', lastG = null;
  items.forEach(it => { if (it.group !== lastG) { h += `<div class="cg">${esc(it.group)}</div>`; lastG = it.group; } h += `<div class="ci" data-ckey="${esc(it.key)}">${it.html || esc(it.label)}</div>`; });
  if (q.trim() && !all.some(it => norm(it.label) === nq)) h += `<div class="ci new" data-ckey="__new">➕ Thêm mới: <b>${esc(q.trim())}</b></div>`;
  $(id + '_list').innerHTML = h || '<div class="cg">Gõ tên để thêm mới</div>';
}
function comboPick(id, key){
  const c = COMBO[id]; if (!c) return;
  const inp = $(id + '_in');
  if (key === '__new') { c.onPick({ key: '__new', label: inp.value.trim() }); }
  else { const it = c.items(inp.value).find(x => x.key === key); if (it) { inp.value = it.label; c.onPick(it); } }
  $(id).classList.remove('open');
}

/* =====================================================================
   TOAST
   ===================================================================== */
let tT, tCb;
// Lỗi giữ lâu hơn vì câu dài và ngay sau đó app tải lại dữ liệu
const TOAST_MS = 2600, TOAST_UNDO_MS = 6000, TOAST_ERR_MS = 9000;
function toast(msg, err, btn, cb){
  const t = $('toast'); t.innerHTML = esc(msg) + (btn ? ` <button id="toastBtn">${esc(btn)}</button>` : '');
  t.className = 'on' + (err ? ' err' : ''); tCb = cb || null;
  if (btn) $('toastBtn').onclick = () => { t.className = ''; if (tCb) tCb(); tCb = null; };
  clearTimeout(tT); tT = setTimeout(() => { t.className = ''; tCb = null; }, err ? TOAST_ERR_MS : btn ? TOAST_UNDO_MS : TOAST_MS);
}

