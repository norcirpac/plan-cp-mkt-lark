import { FIELD_TYPE, FILTER_OR_LIMIT, MAX_RANGE_DAYS, TABLES, WRITABLE_TYPES, appKeysOf, idFieldOf } from './config.js';
import { fromLark, splitList, toLark, vnDateString, vnNowStamp, vnTimestamp } from './lark/mapper.js';

const DELAYED_STATUS = 'Trì hoãn';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const isReadableField = ([, , kind]) => kind !== 'user' && !kind.startsWith('link:');

function chunk(list, size) {
  const parts = [];
  for (let i = 0; i < list.length; i += size) parts.push(list.slice(i, i + size));
  return parts;
}

export function listDays(from, to) {
  const start = vnTimestamp(from, false);
  const end = vnTimestamp(to, false);
  if (start === null || end === null || end < start) throw new Error(`Khoảng ngày không hợp lệ: ${from} → ${to}`);
  const days = [];
  for (let ms = start; ms <= end; ms += ONE_DAY_MS) days.push(vnDateString(ms, false));
  if (days.length > MAX_RANGE_DAYS) throw new Error(`Khoảng ngày quá dài: ${days.length} ngày (tối đa ${MAX_RANGE_DAYS})`);
  return days;
}

/** range/batch đúng hợp đồng của backend Apps Script cũ (legacy/Code.gs), chạy thẳng trên SDK. */
export function createStore({ client, now = () => Date.now() }) {
  // type → (id của app → record_id của Lark)
  const indexes = new Map();
  let people = [];

  function indexOf(type) {
    if (!indexes.has(type)) indexes.set(type, new Map());
    return indexes.get(type);
  }

  function recordToObject(type, record) {
    const obj = Object.fromEntries(appKeysOf(type).map((key) => [key, '']));
    for (const [key, fieldName, kind] of TABLES[type].fields.filter(isReadableField)) {
      obj[key] = fromLark(kind, record.fields[fieldName]);
    }
    return obj;
  }

  async function readType(type, filter) {
    const records = await client.readRecords(type, filter);
    const hasIdField = idFieldOf(type) !== null;
    const index = indexOf(type);
    const objects = [];
    for (const record of records) {
      const obj = recordToObject(type, record);
      if (!Object.values(obj).some((value) => value !== '')) continue;
      if (hasIdField) {
        // Bản ghi tạo tay trong Lark chưa có id → dùng record_id; lần lưu sau sẽ ghi id này vào cột
        if (obj.id === '') obj.id = record.recordId;
        index.set(obj.id, record.recordId);
      }
      objects.push(obj);
    }
    return objects;
  }

  async function readPeople() {
    const records = await client.readRecords('nhansu');
    people = records
      .map((record) => ({ ten: fromLark('text', record.fields['Tên']), userId: record.fields['Người']?.[0]?.id ?? '' }))
      .filter((person) => person.ten);
    return people;
  }

  async function dayFilter(type, days) {
    const fieldId = await client.fieldId(type, 'Ngày');
    return {
      conjunction: 'or',
      conditions: days.map((day) => ({ fieldId, operator: 'is', value: vnTimestamp(day, false), fieldType: FIELD_TYPE.DATE_TIME })),
    };
  }

  async function viecFilter(days) {
    const filter = await dayFilter('viec', days);
    const delayed = await client.findOption('viec', 'Trạng thái', DELAYED_STATUS);
    if (!delayed) return filter;
    const fieldId = await client.fieldId('viec', 'Trạng thái');
    filter.conditions.push({ fieldId, operator: 'is', value: delayed.id, fieldType: FIELD_TYPE.SINGLE_SELECT });
    return filter;
  }

  async function readByText(type, fieldName, values) {
    const uniqueValues = [...new Set(values)].filter(Boolean);
    if (!uniqueValues.length) return [];
    const fieldId = await client.fieldId(type, fieldName);
    const parts = await Promise.all(chunk(uniqueValues, FILTER_OR_LIMIT).map((part) => readType(type, {
      conjunction: 'or',
      conditions: part.map((value) => ({ fieldId, operator: 'is', value, fieldType: FIELD_TYPE.TEXT })),
    })));
    return parts.flat();
  }

  async function range(from, to) {
    const days = listDays(from, to);
    const inRange = (obj) => obj.ngay >= from && obj.ngay <= to;
    const [chudeFilter, viecRowsFilter, baiFilter, bangiaoFilter] = await Promise.all([
      dayFilter('chude', days),
      viecFilter(days),
      dayFilter('bai', days),
      dayFilter('bangiao', days),
    ]);
    const [, danhmuc, macDinh, thuVien, mau, chuDe, viecRows, bai, banGiao] = await Promise.all([
      readPeople(),
      readType('danhmuc'),
      readType('macdinh'),
      readType('thuvien'),
      readType('mau'),
      readType('chude', chudeFilter),
      readType('viec', viecRowsFilter),
      readType('bai', baiFilter),
      readType('bangiao', bangiaoFilter),
    ]);
    const tonDong = viecRows.filter((viec) => viec.trangThai === DELAYED_STATUS);
    const tonDongBai = (await readByText('bai', 'viecId', tonDong.map((viec) => viec.id))).filter((post) => !inRange(post));
    return {
      nhanSu: people.map(({ ten }) => ({ ten })),
      danhMuc: {
        kenh: danhmuc.map((row) => row.kenh).filter(Boolean),
        dangBai: danhmuc.map((row) => row.dangBai).filter(Boolean),
        lyDo: danhmuc.map((row) => row.lyDo).filter(Boolean),
      },
      macDinh,
      thuVien,
      mau,
      chuDe: chuDe.filter(inRange),
      viec: viecRows.filter(inRange),
      bai: bai.filter(inRange),
      banGiao: banGiao.filter(inRange),
      tonDong,
      tonDongBai,
    };
  }

  async function ensureIndexed(type, appIds) {
    const index = indexOf(type);
    const missing = appIds.map(String).filter((id) => id && !index.has(id));
    // Đọc lại theo id trước khi coi là bản ghi mới, tránh tạo trùng khi người khác vừa tạo cùng id
    await readByText(type, idFieldOf(type), missing);
  }

  async function writeContext(type, objects) {
    const options = new Map();
    for (const [key, fieldName, kind] of TABLES[type].fields) {
      if (kind !== 'single' && kind !== 'multi') continue;
      const texts = new Set(objects.flatMap((obj) => (kind === 'multi' ? splitList(obj[key]) : [String(obj[key] ?? '').trim()])));
      texts.delete('');
      for (const text of texts) {
        const option = (await client.findOption(type, fieldName, text)) ?? (await client.addOption(type, fieldName, text));
        options.set(`${fieldName}|${text}`, option);
      }
    }
    const tableIds = new Map();
    for (const [, , kind] of TABLES[type].fields) {
      if (!kind.startsWith('link:')) continue;
      const target = kind.slice('link:'.length);
      tableIds.set(target, await client.tableId(target));
    }
    const userIdByName = new Map(people.filter((person) => person.userId).map((person) => [person.ten, person.userId]));
    return {
      option: (fieldName, text) => options.get(`${fieldName}|${text}`) ?? null,
      userId: (name) => userIdByName.get(name) ?? null,
      recordId: (target, appId) => indexOf(target).get(String(appId)) ?? null,
      tableId: (target) => tableIds.get(target) ?? null,
    };
  }

  const toLarkFields = (type, obj, ctx) => Object.fromEntries(
    TABLES[type].fields.map(([key, fieldName, kind]) => [fieldName, toLark(kind, obj[key], ctx, fieldName)]),
  );

  const dropNulls = (fields) => Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== null));

  async function guarded(type, action, count, write) {
    if (!count) return [];
    try {
      return await write();
    } catch (error) {
      throw new Error(`Lưu bảng "${TABLES[type].name}" lỗi khi ${action} ${count} bản ghi: ${error.message}`, { cause: error });
    }
  }

  async function writeType(type, typeOps, stamp) {
    const saved = typeOps.filter((op) => op.op === 'save').map((op) => ({ ...op.obj, capNhat: stamp }));
    await ensureIndexed(type, [...saved.map((obj) => obj.id), ...typeOps.filter((op) => op.op === 'del').map((op) => op.id)]);
    if (type === 'bai') await ensureIndexed('viec', saved.map((obj) => obj.viecId));
    const ctx = await writeContext(type, saved);
    const index = indexOf(type);
    const creates = new Map();
    const updates = new Map();
    const deletes = new Set();
    let done = 0;
    let savedIndex = 0;
    for (const op of typeOps) {
      if (op.op === 'del') {
        const recordId = index.get(String(op.id));
        if (!recordId || deletes.has(recordId)) continue;
        deletes.add(recordId);
        updates.delete(recordId);
        done++;
        continue;
      }
      const obj = saved[savedIndex++];
      const fields = toLarkFields(type, obj, ctx);
      const recordId = index.get(String(obj.id));
      if (recordId) updates.set(recordId, { recordId, fields });
      else creates.set(String(obj.id), dropNulls(fields));
      done++;
    }
    await guarded(type, 'sửa', updates.size, () => client.setRecords(type, [...updates.values()]));
    const createdIds = await guarded(type, 'thêm', creates.size, () => client.addRecords(type, [...creates.values()]));
    [...creates.keys()].forEach((appId, i) => index.set(appId, createdIds[i]));
    await guarded(type, 'xoá', deletes.size, () => client.deleteRecords(type, [...deletes]));
    for (const [appId, recordId] of index) if (deletes.has(recordId)) index.delete(appId);
    return done;
  }

  async function batch(ops) {
    const opsByType = new Map();
    for (const op of ops) {
      if (!WRITABLE_TYPES.includes(op.type)) throw new Error(`Không ghi được ${op.type}`);
      if (!opsByType.has(op.type)) opsByType.set(op.type, []);
      opsByType.get(op.type).push(op);
    }
    if (!people.length) await readPeople();
    const stamp = vnNowStamp(now());
    let done = 0;
    // Ghi theo WRITABLE_TYPES để bài luôn ghi sau việc
    for (const type of WRITABLE_TYPES) {
      if (opsByType.has(type)) done += await writeType(type, opsByType.get(type), stamp);
    }
    return { done };
  }

  return { range, batch, people: () => people.map((person) => ({ ...person })) };
}
