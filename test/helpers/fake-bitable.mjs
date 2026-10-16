import { TABLES } from '../../js/config.js';

// Mã kiểu cột của Lark: Text 1, Number 2, SingleSelect 3, MultiSelect 4, DateTime 5, Checkbox 7, User 11, Url 15, DuplexLink 21
const FIELD_TYPE_OF_KIND = { text: 1, num: 2, single: 3, multi: 4, date: 5, datetime: 5, check: 7, user: 11, url: 15 };
const LINK_FIELD_TYPE = 21;
export const SDK_WRITE_LIMIT = 200;

export const text = (value) => [{ type: 'text', text: value }];

function schemaOf(type) {
  const seenNames = new Set();
  const fields = [];
  TABLES[type].fields.forEach(([, name, kind]) => {
    if (seenNames.has(name)) return;
    seenNames.add(name);
    fields.push({
      id: `${type}_f${fields.length}`,
      name,
      type: kind.startsWith('link:') ? LINK_FIELD_TYPE : FIELD_TYPE_OF_KIND[kind],
      property: kind === 'single' || kind === 'multi' ? { options: [] } : null,
    });
  });
  return fields;
}

const cellText = (raw) => (Array.isArray(raw) ? raw.map((segment) => segment?.text ?? '').join('') : String(raw ?? ''));

class FakeTable {
  constructor(type) {
    this.type = type;
    this.name = TABLES[type].name;
    this.id = `tbl_${type}`;
    this.fields = schemaOf(type);
    this.records = [];
    this.calls = [];
    this.failNext = null;
    this.nextRecordNumber = 1;
    this.listeners = { add: [], modify: [], delete: [] };
  }

  fieldByName(name) {
    const field = this.fields.find((candidate) => candidate.name === name);
    if (!field) throw new Error(`fake: bảng ${this.name} không có cột ${name}`);
    return field;
  }

  option(fieldName, name) {
    const field = this.fieldByName(fieldName);
    let found = field.property.options.find((candidate) => candidate.name === name);
    if (!found) {
      found = { id: `opt_${field.id}_${field.property.options.length}`, name };
      field.property.options.push(found);
    }
    return { id: found.id, text: found.name };
  }

  seed(valuesByName, recordId = `rec_${this.type}_${this.nextRecordNumber++}`) {
    const fields = {};
    for (const [name, value] of Object.entries(valuesByName)) fields[this.fieldByName(name).id] = value;
    this.records.push({ recordId, fields });
    return recordId;
  }

  valuesOf(recordId) {
    const record = this.records.find((candidate) => candidate.recordId === recordId);
    if (!record) return null;
    return Object.fromEntries(this.fields.map((field) => [field.name, record.fields[field.id] ?? null]));
  }

  guard(method, size) {
    this.calls.push({ method, size });
    if (size > SDK_WRITE_LIMIT) throw new Error('SingleRecordOperationLimitExceeded');
    if (this.failNext !== method) return;
    this.failNext = null;
    throw new Error(`fake ${method} lỗi`);
  }

  matches(record, filter) {
    const results = filter.conditions.map((condition) => {
      if ('conjunction' in condition) return this.matches(record, condition);
      if (condition.operator !== 'is') throw new Error(`fake: chưa hỗ trợ toán tử ${condition.operator}`);
      const field = this.fields.find((candidate) => candidate.id === condition.fieldId);
      const raw = record.fields[condition.fieldId];
      if (field.type === FIELD_TYPE_OF_KIND.date) return raw === condition.value;
      if (field.type === FIELD_TYPE_OF_KIND.single) return raw?.id === condition.value;
      return cellText(raw) === condition.value;
    });
    return filter.conjunction === 'or' ? results.some(Boolean) : results.every(Boolean);
  }

  async getFieldMetaList() {
    return structuredClone(this.fields);
  }

  async getFieldById(fieldId) {
    const field = this.fields.find((candidate) => candidate.id === fieldId);
    return {
      addOption: async (name) => {
        this.calls.push({ method: 'addOption', name });
        field.property.options.push({ id: `opt_${field.id}_${field.property.options.length}`, name });
        return true;
      },
    };
  }

  async getRecordsByPage({ pageSize = 200, pageToken, filter } = {}) {
    this.calls.push({ method: 'getRecordsByPage', filter });
    const matched = this.records.filter((record) => !filter || this.matches(record, filter));
    const start = pageToken ? Number(pageToken) : 0;
    const hasMore = start + pageSize < matched.length;
    return {
      records: structuredClone(matched.slice(start, start + pageSize)),
      hasMore,
      pageToken: hasMore ? String(start + pageSize) : undefined,
      total: matched.length,
    };
  }

  async addRecords(list) {
    this.guard('addRecords', list.length);
    return list.map(({ fields }) => {
      const recordId = `rec_${this.type}_${this.nextRecordNumber++}`;
      this.records.push({ recordId, fields: structuredClone(fields) });
      return recordId;
    });
  }

  async setRecords(list) {
    this.guard('setRecords', list.length);
    for (const { recordId, fields } of list) {
      const record = this.records.find((candidate) => candidate.recordId === recordId);
      if (!record) throw new Error(`fake: không có bản ghi ${recordId}`);
      Object.assign(record.fields, structuredClone(fields));
    }
    return list.map(({ recordId }) => recordId);
  }

  async deleteRecords(recordIds) {
    this.guard('deleteRecords', recordIds.length);
    this.records = this.records.filter((record) => !recordIds.includes(record.recordId));
    return true;
  }

  listen(kind, callback) {
    this.listeners[kind].push(callback);
    return () => { this.listeners[kind] = this.listeners[kind].filter((candidate) => candidate !== callback); };
  }

  onRecordAdd(callback) { return this.listen('add', callback); }

  onRecordModify(callback) { return this.listen('modify', callback); }

  onRecordDelete(callback) { return this.listen('delete', callback); }

  emit(kind, data) {
    this.listeners[kind].forEach((callback) => callback({ data }));
  }
}

export function createFakeBitable({ userId = 'u_me', canEdit = true } = {}) {
  const tables = Object.fromEntries(Object.keys(TABLES).map((type) => [type, new FakeTable(type)]));
  const tableByName = new Map(Object.values(tables).map((table) => [table.name, table]));
  const bitable = {
    base: {
      async getTableByName(name) {
        const table = tableByName.get(name);
        if (!table) throw new Error(`fake: không có bảng ${name}`);
        return table;
      },
      getPermission: async () => canEdit,
    },
    bridge: { getUserId: async () => userId },
  };
  return { bitable, tables };
}
