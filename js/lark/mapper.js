// Việt Nam không đổi giờ mùa hè nên cộng +7 giờ cố định, không phụ thuộc múi giờ máy người dùng
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const VN_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/;
const FALSE_CHECK_VALUES = ['', '0', 'false', 'FALSE'];

const pad2 = (n) => String(n).padStart(2, '0');

export function vnTimestamp(text, withTime) {
  const match = VN_DATE_PATTERN.exec(String(text ?? '').trim());
  if (!match) return null;
  const [, year, month, day, hours, minutes] = match;
  const useTime = withTime && hours !== undefined;
  return Date.UTC(+year, +month - 1, +day, useTime ? +hours : 0, useTime ? +minutes : 0) - VN_OFFSET_MS;
}

export function vnDateString(ms, withTime) {
  const vn = new Date(ms + VN_OFFSET_MS);
  const day = `${vn.getUTCFullYear()}-${pad2(vn.getUTCMonth() + 1)}-${pad2(vn.getUTCDate())}`;
  if (!withTime) return day;
  return `${day} ${pad2(vn.getUTCHours())}:${pad2(vn.getUTCMinutes())}`;
}

export function vnNowStamp(nowMs) {
  const vn = new Date(nowMs + VN_OFFSET_MS);
  return `${vnDateString(nowMs, false)}T${pad2(vn.getUTCHours())}:${pad2(vn.getUTCMinutes())}:${pad2(vn.getUTCSeconds())}`;
}

export const splitList = (text) => String(text ?? '').split(',').map((part) => part.trim()).filter(Boolean);

const isEmptyCell = (raw) => raw === null || raw === undefined || raw === '' || (Array.isArray(raw) && raw.length === 0);

function segmentsText(raw) {
  if (!Array.isArray(raw)) return String(raw);
  return raw.map((segment) => (segment && typeof segment === 'object' ? segment.text ?? '' : String(segment))).join('');
}

function urlOf(raw) {
  if (!Array.isArray(raw)) return typeof raw === 'object' ? raw.link ?? '' : String(raw);
  const withLink = raw.find((segment) => segment?.link);
  return withLink ? withLink.link : segmentsText(raw);
}

/** Giá trị gốc của Lark → chuỗi app dùng. Cột người dùng và liên kết không đọc (app dùng cột chữ đi kèm). */
export function fromLark(kind, raw) {
  if (kind === 'check') return raw ? '1' : '';
  if (isEmptyCell(raw)) return '';
  switch (kind) {
    case 'text': return segmentsText(raw);
    case 'single': return typeof raw === 'object' && !Array.isArray(raw) ? raw.text ?? '' : segmentsText(raw);
    case 'multi': return raw.map((option) => option.text).join(', ');
    case 'num': return String(Number(raw));
    case 'date': return vnDateString(raw, false);
    case 'datetime': return vnDateString(raw, true);
    case 'url': return urlOf(raw);
    default: return '';
  }
}

/** Chuỗi của app → giá trị ghi vào Lark. `null` nghĩa là để trống ô. */
export function toLark(kind, value, ctx, fieldName) {
  if (kind === 'check') return !FALSE_CHECK_VALUES.includes(String(value ?? ''));
  const text = String(value ?? '').trim();
  if (text === '') return null;
  switch (kind) {
    case 'text': return [{ type: 'text', text }];
    case 'single': return ctx.option(fieldName, text);
    case 'multi': {
      const options = splitList(text).map((part) => ctx.option(fieldName, part)).filter(Boolean);
      return options.length ? options : null;
    }
    case 'num': {
      const number = Number(text.replace(',', '.'));
      return Number.isNaN(number) ? null : number;
    }
    case 'date': return vnTimestamp(text, false);
    case 'datetime': return vnTimestamp(text, true);
    case 'url': return [{ type: 'url', text, link: text }];
    case 'user': {
      const ids = splitList(text).map((name) => ctx.userId(name)).filter(Boolean);
      return ids.length ? ids.map((id) => ({ id })) : null;
    }
    default: break;
  }
  if (kind.startsWith('link:')) {
    const target = kind.slice('link:'.length);
    const recordId = ctx.recordId(target, text);
    return recordId ? { text: '', type: 'text', recordIds: [recordId], tableId: ctx.tableId(target) } : null;
  }
  throw new Error(`Kiểu cột không hỗ trợ: ${kind}`);
}
