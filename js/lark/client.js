import { READ_PAGE_SIZE, TABLES, WRITE_CHUNK_SIZE } from '../config.js';

function chunk(list, size) {
  const parts = [];
  for (let i = 0; i < list.length; i += size) parts.push(list.slice(i, i + size));
  return parts;
}

/**
 * Lớp mỏng bọc SDK Lark Base: làm việc theo tên bảng/tên cột của config,
 * đổi qua lại field id ở đây để các lớp trên không phải biết.
 */
export function createLarkClient(bitable) {
  const openedTables = new Map();

  async function loadMeta(entry) {
    const metas = await entry.table.getFieldMetaList();
    entry.metaByName = new Map(metas.map((meta) => [meta.name, meta]));
    entry.nameById = new Map(metas.map((meta) => [meta.id, meta.name]));
  }

  async function open(type) {
    if (openedTables.has(type)) return openedTables.get(type);
    const name = TABLES[type].name;
    const table = await bitable.base.getTableByName(name);
    const entry = { name, table };
    await loadMeta(entry);
    openedTables.set(type, entry);
    return entry;
  }

  function metaOf(entry, fieldName) {
    const meta = entry.metaByName.get(fieldName);
    if (!meta) throw new Error(`Bảng "${entry.name}" không có cột "${fieldName}"`);
    return meta;
  }

  const toFieldIds = (entry, fieldsByName) => Object.fromEntries(
    Object.entries(fieldsByName).map(([fieldName, value]) => [metaOf(entry, fieldName).id, value]),
  );

  async function findOption(type, fieldName, text) {
    const meta = metaOf(await open(type), fieldName);
    const option = (meta.property?.options ?? []).find((candidate) => candidate.name === text);
    return option ? { id: option.id, text: option.name } : null;
  }

  return {
    async tableId(type) {
      return (await open(type)).table.id;
    },

    async fieldId(type, fieldName) {
      return metaOf(await open(type), fieldName).id;
    },

    findOption,

    async addOption(type, fieldName, text) {
      const entry = await open(type);
      // Meta nạp một lần mỗi phiên; phiên khác có thể vừa thêm đúng lựa chọn này → nạp lại trước khi thêm
      await loadMeta(entry);
      const existing = await findOption(type, fieldName, text);
      if (existing) return existing;
      const field = await entry.table.getFieldById(metaOf(entry, fieldName).id);
      await field.addOption(text);
      await loadMeta(entry);
      const option = await findOption(type, fieldName, text);
      if (!option) throw new Error(`Không thêm được lựa chọn "${text}" vào cột "${fieldName}" của bảng "${entry.name}"`);
      return option;
    },

    async readRecords(type, filter) {
      const entry = await open(type);
      const records = [];
      let pageToken;
      do {
        const page = await entry.table.getRecordsByPage({
          pageSize: READ_PAGE_SIZE,
          ...(pageToken ? { pageToken } : {}),
          ...(filter ? { filter } : {}),
        });
        for (const record of page.records) {
          const fields = {};
          for (const [fieldId, value] of Object.entries(record.fields)) {
            const fieldName = entry.nameById.get(fieldId);
            if (fieldName) fields[fieldName] = value;
          }
          records.push({ recordId: record.recordId, fields });
        }
        pageToken = page.hasMore ? page.pageToken : undefined;
      } while (pageToken);
      return records;
    },

    async addRecords(type, list) {
      const entry = await open(type);
      const recordIds = [];
      for (const part of chunk(list, WRITE_CHUNK_SIZE)) {
        recordIds.push(...await entry.table.addRecords(part.map((fields) => ({ fields: toFieldIds(entry, fields) }))));
      }
      return recordIds;
    },

    async setRecords(type, list) {
      const entry = await open(type);
      for (const part of chunk(list, WRITE_CHUNK_SIZE)) {
        await entry.table.setRecords(part.map(({ recordId, fields }) => ({ recordId, fields: toFieldIds(entry, fields) })));
      }
    },

    async deleteRecords(type, recordIds) {
      const entry = await open(type);
      for (const part of chunk(recordIds, WRITE_CHUNK_SIZE)) await entry.table.deleteRecords(part);
    },

    canEdit: () => bitable.base.getPermission({ entity: 'Base', type: 'editable' }),

    currentUserId: () => bitable.bridge.getUserId(),

    async onChange(types, callback) {
      const unsubscribers = [];
      for (const type of types) {
        const { table } = await open(type);
        unsubscribers.push(table.onRecordAdd(callback), table.onRecordModify(callback), table.onRecordDelete(callback));
      }
      return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
    },
  };
}
