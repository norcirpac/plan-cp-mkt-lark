/* =====================================================================
   CÀI ĐẶT
   ===================================================================== */
function renderCaiDat(){
  let h = `<div class="grid2"><div class="card sec"><h3>🔗 Kết nối</h3><div class="allok">● Đang đọc và ghi thẳng Lark Base</div><div class="hint" style="margin-top:8px">Mọi thay đổi lưu vào Base bằng quyền Lark của bạn${APP_ENV.readOnly ? ' — bạn đang ở <b>chế độ chỉ xem</b>' : ''}. Thêm, sửa dữ liệu gốc (Nhân sự, Danh mục) ngay trong các bảng của Base.</div></div></div>`;
  h += `<div class="card sec"><h3>👥 Phân công mảng</h3><div class="hint" style="margin-bottom:8px">Chọn được nhiều người mỗi ô. Mảng 1 người: tên tự điền xuống chủ đề và việc nhỏ. Mảng từ 2 người: tên hiện ở ô mảng, chủ đề để leader phân công. Dán mẫu và bàn giao dùng bảng này.</div>${pcTable(['Sáng','Tối'])}
    <div class="bar" style="margin-top:10px"><button class="btn pri" data-act="pcapply">🔄 Cập nhật phân công vào cây ${CA[S.ca].lb.toLowerCase()} ${esc(fmtD(S.date))}</button></div></div>`;
  const blocks = blockList();
  h += `<div class="card sec"><h3>📋 Khối mẫu (${blocks.length})</h3><div class="hint" style="margin-bottom:10px">Lưu hoặc cập nhật khối: trên cây, bấm ⋯ ở ô <b>nhóm</b> (Shopee, Social) hoặc ô <b>mảng</b> (Lazada, TikTok, Nô Tì) → <b>Lưu … thành khối mẫu</b>.</div>`;
  MANG.forEach(m => {
    const bl = blocks.filter(b => b.mang === m); if (!bl.length) return;
    h += `<div class="brow" style="${mcStyle(m)}"><div class="bm">${esc(m)}</div><div class="blocks">${bl.map(b => { const rows = S.mau.filter(x => bkey(x) === b.key); const nv = rows.reduce((s, r) => s + jparse(r.viecJson).length, 0);
      return `<div class="blk"><b>${esc(b.khoi)}</b><div class="hint">${rows.length} chủ đề · ${nv} việc nhỏ</div><ul>${rows.map(r => `<li>${esc(r.chuDe)}</li>`).join('')}</ul><div class="bar" style="margin:0">${!(m === 'Social' && SOCIAL_NHOM.includes(b.khoi)) ? `<button class="btn sm" data-act="renblock" data-k="${esc(b.key)}">Đổi tên</button>` : ''}<button class="btn sm danger" data-act="delblock" data-k="${esc(b.key)}">Xoá khối</button></div></div>`; }).join('')}</div></div>`;
  });
  h += `</div>`;
  const items = libItems();
  h += `<div class="card sec"><h3>📚 Danh sách chọn nhanh (${items.length})</h3><div class="hint" style="margin-bottom:8px">Là danh sách gợi ý khi gõ tên chủ đề / việc nhỏ. Gồm việc trong khối mẫu và việc mem tự thêm. Mục nào thừa thì xoá.</div>
    <div class="bar"><input id="libq" class="btn" placeholder="🔍 Tìm tên việc, chủ đề…" style="flex:1;min-width:220px;font-weight:400;cursor:text"><select id="libm" class="btn"><option value="">Tất cả mảng</option>${MANG.map(m => `<option>${m}</option>`).join('')}</select></div>
    <div class="liblist">${items.map(it => `<div class="lrow" data-txt="${esc(norm(it.ten + ' ' + it.cd + ' ' + it.mang))}" data-m="${esc(it.mang)}"><span class="ln" title="${esc(it.ten)}">${it.kind === 'cd' ? '<span class="chip">Chủ đề</span> ' : ''}${esc(it.ten)}</span><span class="hint" title="${esc(it.mang + (it.cd ? ' · ' + it.cd : ''))}">${esc(it.mang)}${it.cd ? ' · ' + esc(it.cd) : ''}</span><span class="chip ${it.src === 'mau' ? '' : 'warn'}">${it.src === 'mau' ? 'khối mẫu: ' + esc(it.khoi) : 'mem thêm'}</span><button class="btn sm danger" data-act="libdel" data-ref="${esc(it.ref)}" title="Xoá">🗑</button></div>`).join('') || '<div class="hint" style="padding:10px">Chưa có mục nào.</div>'}</div></div>`;
  h += `<div class="card sec"><h3>👤 Nhân sự</h3><div>${names().map(pc).join(' ')}</div><div class="hint" style="margin-top:6px">Thêm / bớt người trong bảng <code>Nhân sự</code> của Lark Base.</div></div>`;
  return h;
}
function pcTable(cas){
  return `<div class="tbl" style="overflow:visible"><table><tr><th>Ca</th>${MANG.map(m => `<th style="${mcStyle(m)};border-top:3px solid var(--mc)">${esc(m)}</th>`).join('')}</tr>${cas.map(ca => `<tr><td><b>${CA[ca].lb}</b></td>${MANG.map(m => `<td style="min-width:150px">${msel('pc|' + ca + '|' + m, names(), pcPeople(S.macDinh, ca, m), 'Chưa có')}</td>`).join('')}</tr>`).join('')}</table></div>`;
}

