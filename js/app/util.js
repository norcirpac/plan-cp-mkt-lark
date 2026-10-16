/* =====================================================================
   HẰNG SỐ & TIỆN ÍCH
   ===================================================================== */
const MANG = ['Shopee','Lazada','TikTok','Nô Tì','Social'];
const MC = {
  'Shopee': { c:'#EE4D2D', ink:'#FFFFFF', g:'#FBC1AD', cd:'#FFE3D9', v:'#FFF4EF', ln:'#EE4D2D' },
  'Lazada': { c:'#1A56DB', ink:'#FFFFFF', g:'#B3CAF8', cd:'#DFE9FE', v:'#F2F6FF', ln:'#1A56DB' },
  'TikTok': { c:'#DB2777', ink:'#FFFFFF', g:'#F7BAD6', cd:'#FCE3EF', v:'#FEF3F8', ln:'#DB2777' },
  'Nô Tì':  { c:'#16A34A', ink:'#FFFFFF', g:'#ABE5C0', cd:'#DCF6E5', v:'#F1FBF5', ln:'#16A34A' },
  'Social': { c:'#EAB308', ink:'#3A2E00', g:'#F9DF7E', cd:'#FCF0BE', v:'#FFFAE5', ln:'#CA9A04' }
};
const NHOM_MANG = { 'Shopee': true, 'Social': true };
const SOCIAL_NHOM = ['Fanpage','Group','TikTok','Threads'];
const defNhom = m => m === 'Shopee' ? 'Hằng ngày' : m === 'Social' ? 'Group' : '';
// Kênh đăng (v8): tên cũ tự đổi sang tên mới
const KENH_MAP = { 'Xóm Săn Sale': 'Group Xóm Săn Sale', 'Hội Săn Deal': 'Group Hội Săn Deal', 'Fanpage': 'Fanpage Nô Tì' };
const mapKenh = s => [...new Set(String(s || '').split(',').map(x => x.trim()).filter(Boolean).map(x => KENH_MAP[x] || x))].join(', ');
const kenhNhom = k => /fanpage/i.test(k) ? 'Fanpage' : /tiktok/i.test(k) ? 'TikTok' : /thread/i.test(k) ? 'Threads' : 'Group';
const CA = { 'Sáng':{s:480,e:1050,lb:'Ca sáng'}, 'Tối':{s:1020,e:1500,lb:'Ca tối'} };
const ST = {
  chua:{lb:'Chưa làm',ic:'⚪'}, dang:{lb:'Đang làm',ic:'🟡'}, xong:{lb:'Xong',ic:'✅'},
  quagio:{lb:'Quá giờ',ic:'🔴'}, tre:{lb:'Trì hoãn',ic:'⏸'}, chuyen:{lb:'Đã chuyển',ic:'↪'}, bo:{lb:'Bỏ',ic:'✖'}
};
const PCOL = ['#7C3AED','#0F766E','#4338CA','#92400E','#A21CAF','#0E7490','#4D7C0F','#1E3A8A','#B91C1C','#334155','#C2410C','#065F46'];
const p2 = n => String(n).padStart(2,'0');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr = s => Array.isArray(s) ? s : String(s || '').split(',').map(t => t.trim()).filter(Boolean);
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(/[^\d.]/g,'')); return isNaN(n) ? 0 : n; };
const jparse = s => { try { const x = JSON.parse(s || '[]'); return Array.isArray(x) ? x : []; } catch(e){ return []; } };
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
const mcStyle = m => { const x = MC[m] || MC.Social; return `--mc:${x.c};--mink:${x.ink};--mg:${x.g};--mcd:${x.cd};--mv:${x.v}`; };
const ls = { get(k){ try { return JSON.parse(localStorage.getItem(k)); } catch(e){ console.warn('Không đọc được localStorage', k, e); return null; } }, set(k,v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){ console.warn('Không ghi được localStorage', k, e); } } };
function nowRel(){ const n = new Date(); let m = n.getHours()*60 + n.getMinutes(); if (m < 300) m += 1440; return m; }
function workday(){ const d = new Date(Date.now() - 5*3600e3); return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()); }
function curCa(){ return nowRel() >= 1020 ? 'Tối' : 'Sáng'; }
function addDays(ds, n){ const d = new Date(ds+'T12:00:00'); d.setDate(d.getDate()+n); return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()); }
function wd(ds){ return new Date(ds+'T12:00:00').getDay(); }
function fmtD(ds){ if (!ds) return ''; return ['CN','T2','T3','T4','T5','T6','T7'][wd(ds)] + ' ' + ds.slice(8,10) + '/' + ds.slice(5,7); }
function weekOf(ds){ const w = wd(ds); const mon = addDays(ds, w === 0 ? -6 : 1 - w); return { from: mon, to: addDays(mon, 6) }; }
function mins(t){ const m = /^(\d{1,2}):(\d{2})/.exec(String(t||'')); if (!m) return null; let v = +m[1]*60 + +m[2]; if (v < 300) v += 1440; return v; }
function hhmm(m){ m = ((m % 1440) + 1440) % 1440; return p2(Math.floor(m/60)) + ':' + p2(m%60); }
const nowHHMM = () => { const n = new Date(); return p2(n.getHours()) + ':' + p2(n.getMinutes()); };
const realDate = () => { const n = new Date(); return n.getFullYear()+'-'+p2(n.getMonth()+1)+'-'+p2(n.getDate()); };
const nowDT = () => realDate() + ' ' + nowHHMM();
function mkDT(ngay, hm){ const m = mins(hm); return (m != null && m >= 1440 ? addDays(ngay, 1) : ngay) + ' ' + hm; }
function dtShow(dt, ngay){ if (!dt) return ''; const [d, t] = String(dt).split(' '); if (!t) return dt; return d === ngay ? t : d.slice(8,10) + '/' + d.slice(5,7) + ' ' + t; }
const dtTime = dt => String(dt || '').split(' ')[1] || '';
const TIMES = (() => { const a = []; for (let m = 360; m <= 1560; m += 15) a.push(hhmm(m)); return a; })();
const slotKey = (ngay, ca) => ngay + (ca === 'Tối' ? '|2' : '|1');
function nextSlot(ngay, ca){ return ca === 'Sáng' ? { ngay, ca: 'Tối' } : { ngay: addDays(ngay, 1), ca: 'Sáng' }; }
function span(v){
  const w = CA[v.ca] || CA['Sáng'];
  if (v.caCa === '1' || !v.batDau) return [w.s, w.e];
  const s = mins(v.batDau); let e = mins(v.ketThuc); if (e == null) e = s + 15; if (e <= s) e += 1440;
  return [s, e];
}
const timeLb = v => (v.caCa === '1' || !v.batDau) ? 'Cả ca' : (v.gap ? v.batDau : `${v.batDau}${v.ketThuc ? '–' + v.ketThuc : ''}`);
const sl = v => (v.soLuong === '' || v.soLuong == null) ? 1 : num(v.soLuong);  // mặc định 1 bài
const gkey = v => v.nhomViec || v.id;
const ordKey = x => (x.thuTu === '' || x.thuTu == null) ? 1e9 : num(x.thuTu);

