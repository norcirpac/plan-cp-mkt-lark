/* =====================================================================
   TẦNG 2 – VIỆC CỦA TÔI
   ===================================================================== */
function renderToi(){
  const opts = names().map(n => `<option ${n === cfg.me ? 'selected' : ''}>${esc(n)}</option>`).join('');
  let h = `<div class="bar card" style="padding:10px 12px"><b>Tôi là</b><select id="meSel" class="btn"><option value="">— chọn tên —</option>${opts}</select><span class="hint">Máy này sẽ nhớ tên bạn.</span>${cfg.me ? `<button class="btn gap" data-act="gapmodal" style="margin-left:auto">⚡ Việc gấp</button>` : ''}</div>`;
  if (!cfg.me) return h + `<div class="empty">Chọn tên để xem việc của bạn trong ${CA[S.ca].lb} · ${esc(fmtD(S.date))}.</div>`;
  const me = cfg.me;
  const mine = slotTasks().filter(v => v.nguoi === me && v.trangThai !== 'Đã chuyển');
  const live = mine.filter(v => v.trangThai !== 'Bỏ');
  const posted = live.reduce((s, v) => s + linksOf(v.id), 0), tgt = live.reduce((s, v) => s + sl(v), 0);
  h += `<div class="mehead">${pc(me)}<span class="big">${CA[S.ca].lb} · ${esc(fmtD(S.date))}</span><span class="chip ${live.length && live.every(v => v.trangThai === 'Xong') ? 'ok' : 'warn'}"><b>${live.filter(v => v.trangThai === 'Xong').length}/${live.length}</b>&nbsp;việc xong</span><span class="chip ${tgt && posted >= tgt ? 'ok' : 'warn'}"><b>${posted}/${tgt}</b>&nbsp;bài</span></div>`;
  h += claimSection(me);
  if (!mine.length) return h + `<div class="empty">Bạn chưa có việc nào trong ${CA[S.ca].lb} · ${esc(fmtD(S.date))}. Vào <b>Cây tổng thể</b>, bấm <b>+ Việc nhỏ</b> dưới chủ đề để lên việc.</div>`;
  const isFull = v => (v.caCa === '1' || !v.batDau) && !v.gap;
  const full = mine.filter(isFull).sort((a, b) => MANG.indexOf(a.mang) - MANG.indexOf(b.mang) || ordKey(a) - ordKey(b));
  const timed = mine.filter(v => !isFull(v)).sort((a, b) => span(a)[0] - span(b)[0]);
  h += `<div class="tlist"><div class="shd" data-dzm="full">CẢ CA <span class="hint">· kéo việc vào đây để thành việc cả ca</span></div>${full.map(myRow).join('')}`;
  h += `<div class="shd" data-dzm="timed">THEO GIỜ <span class="hint">· giữ chuột kéo dòng lên / xuống để đổi giờ</span></div>${timed.map(myRow).join('')}</div>`;
  h += `<div class="bar"><button class="btn" data-act="metrics">📊 Điền số liệu cuối ca</button><span class="hint">Điền tiếp cận, thích, bình luận cho bài đã đăng. Chỉ cần điền bài muốn cập nhật.</span></div>`;
  return h;
}

function claimSection(me){
  const myM = myMangs(me);
  const free = slotTasks().filter(v => !v.nguoi && v.trangThai === 'Chưa làm' && (!myM.length || myM.includes(v.mang)));
  if (!free.length) return '';
  return `<div class="card sec claim"><h3>🙋 Việc chưa có người nhận (${free.length})</h3>${free.map(v => `<div class="crow" style="${mcStyle(v.mang)}">${timeBadge(v)}<span class="mtag">${esc(v.mang)}</span><b>${esc(v.viec)}</b><span class="hint">${esc(v.chuDeTen)}</span><button class="btn sm pri" data-act="claimfree" data-id="${v.id}" style="margin-left:auto">Nhận</button></div>`).join('')}</div>`;
}

function ordOpts(first, all, sel){
  const f = first.filter(x => all.includes(x)), rest = all.filter(x => !f.includes(x));
  return `<option value=""></option>` + f.map(x => `<option ${x === sel ? 'selected' : ''}>${esc(x)}</option>`).join('') + (f.length && rest.length ? '<option disabled>──────────</option>' : '') + rest.map(x => `<option ${x === sel ? 'selected' : ''}>${esc(x)}</option>`).join('');
}
const slOpts = (cur) => `<option value="0" ${cur === '0' ? 'selected' : ''}>Không đăng bài</option>` + Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}" ${String(i + 1) === cur ? 'selected' : ''}>${i + 1} bài</option>`).join('');
function myRow(v){
  const k = stOf(v), n = sl(v), ps = postsOf(v.id), done1 = ps.filter(isDoneP).length;
  const done = k === 'xong', off = ['tre','bo','chuyen'].includes(k), doing = v.trangThai === 'Đang làm';
  let cb;
  if (off) cb = `<span class="cb off" title="${ST[k].lb}">${k === 'tre' ? '⏸' : '✖'}</span>`;
  else if (n === 0) cb = `<span class="cb ${done ? 'on' : ''}" data-act="tick0" data-id="${v.id}" title="Bấm khi làm xong"></span>`;
  else if (n === 1) cb = `<span class="cb ${done ? 'on' : ''}" data-act="tick1" data-id="${v.id}" title="Bấm để dán link bài"></span>`;
  else cb = `<span class="cb auto ${done ? 'on' : ''}" title="Tự tick khi đủ ${n} bài"></span>`;
  let mid = `<span class="nm">${esc(v.viec)}</span><span class="mtag" style="${mcStyle(v.mang)}">${esc(v.mang)}</span><span class="ctag" title="${esc(v.chuDeTen)}">${esc(v.chuDeTen)}</span>`;
  if (n === 1) { const d1 = (ps[0] && ps[0].dangBai) || arr(v.dangBai)[0] || ''; if (d1 || !done) mid += `<span class="dtag" data-act="dangpop" data-id="${v.id}" title="Đổi dạng bài">${esc(d1 || 'Dạng bài')} ▾</span>`; }
  if (n >= 2) mid += `<span class="dtag prog ${done1 >= n ? 'ok' : ''}" data-act="expand" data-id="${v.id}">${done1}/${n} bài ${S.open.has(v.id) ? '▴' : '▸'}</span>`;
  if (k === 'tre') mid += `<span class="hint" style="color:var(--tre)">⏸ ${esc(v.lyDo)} → ${esc(fmtD(v.doiNgay || v.ngay))}${v.doiCa ? ' ca ' + esc(v.doiCa.toLowerCase()) : ''}</span>`;
  let right = '';
  if (n === 1 && ps[0]) right = ps[0].link ? `<a class="lnk" href="${esc(ps[0].link)}" target="_blank" rel="noopener" title="Mở bài">🔗</a><span class="hint">${esc(dtShow(ps[0].tgDang, v.ngay))}</span>` : ps[0].khongLink === '1' ? '<span class="hint">✓ không link</span>' : '';
  const acts = (off || done) ? '' : `<button class="abtn ${doing ? 'on' : ''}" data-act="doing" data-id="${v.id}" title="${doing ? 'Bấm để bỏ đang làm' : 'Đánh dấu đang làm'}">▶ Đang làm</button><button class="abtn" data-act="m-delay" data-id="${v.id}">⏸ Trì hoãn</button>`;
  let h = `<div class="trow ${done ? 'done' : ''} ${off ? 'off' : ''} ${doing ? 'doing' : ''} ${k === 'bo' ? 'strike' : ''}" style="${mcStyle(v.mang)}" draggable="${off || done ? 'false' : 'true'}" data-dgm="${v.id}"><div class="tt">${timeBadge(v)}</div><div>${cb}</div><div class="tn">${mid}</div><div class="tr">${right}</div><div class="tr">${acts}</div><button class="dots" data-act="menu-my" data-id="${v.id}">⋯</button></div>`;
  if (n === 1 && S.linkOpen.has(v.id)) h += link1Panel(v, ps[0]);
  if (n >= 2 && S.open.has(v.id)) h += multiPanel(v, ps, n);
  return h;
}

function link1Panel(v, b){
  const has = isDoneP(b);
  return `<div class="tpanel"><div class="hrow2"><input class="lkin" id="lk-${v.id}" data-enter="savelink1" data-id="${v.id}" value="${esc(b ? b.link : '')}" placeholder="Dán link bài vừa đăng rồi bấm Lưu…"><button class="btn sm pri" data-act="savelink1" data-id="${v.id}">Lưu</button><button class="btn sm" data-act="nolink1" data-id="${v.id}" title="Việc không có link (seeding, duyệt bài…)">Xong, không có link</button>
    ${has ? `${b.link ? `<span class="hint">Đăng lúc</span><input type="time" data-f="gio" data-vid="${v.id}" data-stt="1" value="${esc(dtTime(b.tgDang))}">` : ''}<button class="btn sm" data-act="untick1" data-id="${v.id}">Bỏ tick</button>` : '<span class="hint">Giờ đăng tự ghi lúc lưu.</span>'}</div></div>`;
}

function multiPanel(v, ps, n){
  const max = Math.max(n, ps.length), ks = arr(v.kenh), ds = arr(v.dangBai);
  let h = `<div class="tpanel"><table class="ptab"><tr><th></th><th>Idea – bài này nói về gì</th><th>Dạng bài</th><th>Kênh</th><th>Link (dán khi đăng xong)</th><th>Đăng lúc</th><th title="Bài xong nhưng không có link">Không link</th></tr>`;
  for (let i = 1; i <= max; i++) {
    const b = ps.find(x => num(x.stt) === i);
    const st = b && b.link ? '✅' : b && b.khongLink === '1' ? '☑️' : b && b.idea ? '🟡' : '⚪';
    const dsel = b ? b.dangBai : ds[(i - 1) % Math.max(1, ds.length)] || '', ksel = b ? b.kenh : ks[(i - 1) % Math.max(1, ks.length)] || '';
    h += `<tr><td>${st} ${i}</td>
      <td><input class="idea" data-f="idea" data-vid="${v.id}" data-stt="${i}" value="${esc(b ? b.idea : '')}" placeholder="vd: so giá trước/sau mã…"></td>
      <td><select data-f="dangBai" data-vid="${v.id}" data-stt="${i}">${ordOpts(ds, S.danhMuc.dangBai, dsel)}</select></td>
      <td><select data-f="kenh" data-vid="${v.id}" data-stt="${i}">${ordOpts(ks, S.danhMuc.kenh, ksel)}</select></td>
      <td><input class="lk" data-f="link" data-vid="${v.id}" data-stt="${i}" value="${esc(b ? b.link : '')}" placeholder="dán link…"></td>
      <td>${b && b.link ? `<input type="time" data-f="gio" data-vid="${v.id}" data-stt="${i}" value="${esc(dtTime(b.tgDang))}">` : '<span class="hint">—</span>'}</td>
      <td class="c"><input type="checkbox" data-f="khongLink" data-vid="${v.id}" data-stt="${i}" ${b && b.khongLink === '1' ? 'checked' : ''} ${b && b.link ? 'disabled' : ''}></td></tr>`;
  }
  return h + `</table></div>`;
}

function savePostField(el){
  const v = vById(el.dataset.vid); if (!v) return;
  const stt = String(el.dataset.stt), f = el.dataset.f, val = el.type === 'checkbox' ? (el.checked ? '1' : '') : el.value.trim();
  let b = S.bai.find(x => x.viecId === v.id && String(x.stt) === stt);
  if (!b) {
    if (!val) return;
    const i = num(stt) - 1, ks = arr(v.kenh), ds = arr(v.dangBai);
    b = { id: uid('b'), viecId: v.id, stt, ngay: v.ngay, ca: v.ca, mang: v.mang, chuDeTen: v.chuDeTen, nguoi: v.nguoi, kenh: ks[i % Math.max(1, ks.length)] || '', dangBai: ds[i % Math.max(1, ds.length)] || '', idea: '', link: '', khongLink: '', tgDang: '', tiepCan: '', thich: '', binhLuan: '', tgDien: '' };
  } else b = Object.assign({}, b);
  if (f === 'gio') { if (!val) return; b.tgDang = mkDT(v.ngay, val); }
  else { b[f] = val; if ((f === 'link' || f === 'khongLink') && val && !b.tgDang) b.tgDang = nowDT(); if (f === 'link' && val) b.khongLink = ''; }
  const ops = [sv('bai', b)];
  const ns = autoStatus(v, S.bai.filter(x => x.viecId === v.id && x.id !== b.id).concat([b]));
  if (ns !== v.trangThai) ops.push(sv('viec', Object.assign({}, v, { trangThai: ns })));
  commit(ops, ns === 'Xong' && v.trangThai !== 'Xong' ? '✅ Xong: ' + v.viec : '');
}

function saveLink1(id, noLink){
  const v = vById(id); if (!v) return;
  const inp = $('lk-' + id); const link = noLink ? '' : (inp ? inp.value.trim() : '');
  if (!noLink && !link) return toast('Dán link bài trước, hoặc bấm "Xong, không có link"', true);
  const old = postsOf(id).find(x => num(x.stt) === 1);
  const b = Object.assign(old ? Object.assign({}, old) : { id: uid('b'), viecId: v.id, stt: '1', ngay: v.ngay, ca: v.ca, mang: v.mang, chuDeTen: v.chuDeTen, nguoi: v.nguoi, kenh: arr(v.kenh)[0] || '', dangBai: arr(v.dangBai)[0] || '', idea: '', tiepCan: '', thich: '', binhLuan: '', tgDien: '' }, { link, khongLink: noLink ? '1' : '' });
  if (!b.tgDang) b.tgDang = nowDT();
  S.linkOpen.delete(id);
  commit([sv('bai', b), sv('viec', Object.assign({}, v, { trangThai: 'Xong' }))], '✅ Xong: ' + v.viec);
}

