import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
// Execute the actual TS services against a deterministic in-memory database.
function serviceHarness() {
  let db: any = {};
  const cache = new Map<string, any>();
  const touchRoom = async (_id: string, updates: Record<string, any>) => {
    for (const [p, value] of Object.entries(updates)) {
      const keys = p.split('/'); let target = db;
      for (const key of keys.slice(0, -1)) target = target[key] ??= {};
      if (value === null) delete target[keys.at(-1)!]; else target[keys.at(-1)!] = structuredClone(value);
    }
  };
  function load(file: string): any {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    if (file.endsWith('.json')) return JSON.parse(readFileSync(file, 'utf8'));
    const module = { exports: {} }; cache.set(file, module);
    const code = ts.transpileModule(readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true}}).outputText;
    const req = (id: string) => {
      if (id === 'firebase/database') return {ref: (_: any, p: string) => p, get: async (p: string) => {const v = structuredClone(p.split('/').reduce((o, k) => o?.[k], db)); return {exists: () => v != null, val: () => v};}};
      if (id.endsWith('config/firebase')) return {database: {}};
      if (id.endsWith('/roomService')) return {touchRoom};
      let p = path.resolve(path.dirname(file), id); if (!path.extname(p)) p += '.ts'; return load(p);
    };
    vm.runInThisContext('(function(require,module,exports){' + code + '\n})')(req, module, module.exports);
    return module.exports;
  }
  return {load, set: (value: any) => {db = value;}, get: () => db};
}

test('Lupus keeps the seer result when their action completes the night', async () => {
  const h = serviceHarness(); const service = h.load('src/games/lupus/services/lupusLogic.ts');
  h.set({rooms: {ABC123: {gameState: {phase: 'night', round: 1, roles: {w: 'lupo', s: 'veggente', g: 'guardia', v: 'villico', v2: 'villico'}, alive: {w: true, s: true, g: true, v: true, v2: true}, guardiaEnabled: true, veggenteEnabled: true, night: {lupoVotes: {w: 'v'}, protectTarget: 'v', protectDone: true}}}}});
  await service.submitSeer('ABC123', 'w');
  const gs = h.get().rooms.ABC123.gameState;
  assert.equal(gs.phase, 'day');
  assert.deepEqual(gs.seerVision, {targetUid: 'w', role: 'lupo', round: 1});
});
