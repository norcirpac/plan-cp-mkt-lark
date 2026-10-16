import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// App cũ tính ca và ngày làm việc theo giờ máy; người dùng ở VN
process.env.TZ = 'Asia/Ho_Chi_Minh';

const ROOT = new URL('../../', import.meta.url);

export function appScriptPaths() {
  const html = readFileSync(new URL('index.html', ROOT), 'utf8');
  return [...html.matchAll(/<script src="(js\/app\/[^"]+)"><\/script>/g)].map((match) => match[1]);
}

function elementStub() {
  return {
    value: '', textContent: '', className: '', innerHTML: '', style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, focus() {},
  };
}

export function loadApp({ nowIso } = {}) {
  const storage = new Map();
  const document = {
    addEventListener() {}, getElementById: () => elementStub(), querySelector: () => null,
    querySelectorAll: () => [], createElement: () => elementStub(), activeElement: null, body: elementStub(),
  };
  const context = {
    console, document, setTimeout, clearTimeout, navigator: {}, scrollX: 0, scrollY: 0,
    requestAnimationFrame: () => 0, scrollTo() {}, addEventListener() {}, isSecureContext: false,
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
  };
  context.window = context;
  vm.createContext(context);
  if (nowIso) {
    const fixedMs = Date.parse(nowIso);
    vm.runInContext(`(() => {
      const RealDate = Date;
      class FixedDate extends RealDate {
        constructor(...args) { super(...(args.length ? args : [${fixedMs}])); }
        static now() { return ${fixedMs}; }
      }
      globalThis.Date = FixedDate;
    })();`, context);
  }
  for (const path of appScriptPaths()) {
    vm.runInContext(readFileSync(new URL(path, ROOT), 'utf8'), context, { filename: path });
  }
  const run = (code) => vm.runInContext(code, context);
  return { run, json: (expression) => JSON.parse(run(`JSON.stringify(${expression})`)) };
}
