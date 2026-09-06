import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const cache = new Map<string, any>();
export function loadServer(file: string): any {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  if (file.endsWith(".json")) return JSON.parse(readFileSync(file, "utf8"));
  const module = { exports: {} };
  cache.set(file, module);
  const code = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInThisContext("(function(require,module,exports){" + code + "\n})")(
    (id: string) => {
      let f = path.resolve(path.dirname(file), id);
      if (!path.extname(f)) f += ".ts";
      return loadServer(f);
    },
    module,
    module.exports,
  );
  return module.exports;
}
