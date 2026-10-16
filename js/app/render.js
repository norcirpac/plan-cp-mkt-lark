/* =====================================================================
   RENDER CHUNG
   ===================================================================== */
function render(){
  document.getElementById('dateInp').value = S.date;
  document.querySelectorAll('#caPill button').forEach(b => b.classList.toggle('on', b.dataset.v === S.ca));
  const m = document.getElementById('mode');
  m.textContent = S.err ? '⚠️ Lỗi kết nối' : APP_ENV.readOnly ? '👁 Chỉ xem' : '● Lark Base';
  m.className = 'mode' + (APP_ENV.readOnly ? ' demo' : '');
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === S.tab));
  const app = document.getElementById('app');
  if (S.loading && !S.nhanSu.length) { app.innerHTML = '<div class="empty">Đang tải…</div>'; return; }
  const keep = captureFocus();
  const sx = window.scrollX, sy = window.scrollY, mw = document.getElementById('mmwrap'), ml = mw ? mw.scrollLeft : 0, mt = mw ? mw.scrollTop : 0;
  app.innerHTML = ({ cay: renderCay, toi: renderToi, tiendo: renderTienDo, caidat: renderCaiDat })[S.tab]();
  restoreFocus(keep);
  const mw2 = document.getElementById('mmwrap'); if (mw2) { mw2.scrollLeft = ml; mw2.scrollTop = mt; }
  window.scrollTo(sx, sy);
  if (S.tab === 'cay') requestAnimationFrame(drawLines);
}
function focusSel(a){ const d = a.dataset; let s = `[data-f="${d.f}"]`; ['id','vid','stt'].forEach(k => { if (d[k] != null) s += `[data-${k}="${d[k]}"]`; }); return s; }
function captureFocus(){ const a = document.activeElement; if (!a || !a.dataset || !a.dataset.f || a.closest('#modal')) return null; return { sel: focusSel(a), pos: a.selectionStart }; }
function restoreFocus(k){ if (!k) return; const el = document.querySelector(k.sel); if (el) { el.focus(); try { el.setSelectionRange(k.pos, k.pos); } catch(e){} } }

