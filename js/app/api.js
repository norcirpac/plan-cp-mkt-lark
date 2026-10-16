/* =====================================================================
   KHO DỮ LIỆU: Lark Base qua window.PlanStore (js/main.js gắn vào)
   ===================================================================== */
const CFG_KEY = 'plancpmkt3_cfg', FOLD_KEY = 'plancpmkt3_fold';
const cfg = Object.assign({ me: '' }, ls.get(CFG_KEY) || {});
delete cfg.url;
const KEYS = { chude: 'chuDe', viec: 'viec', bai: 'bai', bangiao: 'banGiao', thuvien: 'thuVien', mau: 'mau', macdinh: 'macDinh' };
const APP_ENV = { readOnly: false };
async function apiRange(from, to){ return window.PlanStore.range(from, to); }
async function apiBatch(ops){ return window.PlanStore.batch(ops); }
// Đang lưu, mở form, kéo thả hoặc gõ chữ thì không tải lại, tránh đè thứ người dùng đang làm
function canAutoRefresh(){
  if (WRITING || !$('modal').classList.contains('hidden') || DRAG || DRAG2 || document.querySelector('.msel.open')) return false;
  const a = document.activeElement;
  return !(a && ['INPUT','TEXTAREA','SELECT'].includes(a.tagName));
}
function askWhoAmI(){
  const ns = names(); if (!ns.length) return;
  openModal(`<h3>Bạn là ai?</h3><div class="hint">Chọn tên của bạn để app lọc đúng "Việc của tôi". Chọn một lần, máy này sẽ nhớ.</div>
    <div class="f"><select id="whoSel" class="btn">${ns.map(n => `<option>${esc(n)}</option>`).join('')}</select></div>
    <div class="bar"><button class="btn pri" data-act="setme">Lưu</button></div>`);
}
