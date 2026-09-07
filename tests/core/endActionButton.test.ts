import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const ts = createRequire(import.meta.url)('typescript');
function render(kind: string, confirm: () => Promise<boolean>, action: () => Promise<void>, disabled = false) {
  const React = {createElement: (type: any, props: any, ...children: any[]) => ({type, props, children}),
    useRef: (current: any) => ({current}), useState: (v: any) => [v, () => {}], Fragment: 'fragment'};
  const module = {exports: {} as any};
  const code = ts.transpileModule(readFileSync('src/core/components/EndActionButton.tsx','utf8'), {
    compilerOptions:{module:ts.ModuleKind.CommonJS, jsx:ts.JsxEmit.React, esModuleInterop:true}}).outputText;
  vm.runInThisContext('(function(require,module,exports){'+code+'\n})')((id: string) => id === 'react' ? React : {
    Button:'button', ErrorBanner:'error', confirmDialog:confirm},module,module.exports);
  return module.exports.EndActionButton({kind,onConfirm:action,disabled}).children[0];
}
test('all closing controls require confirmation and use consistent semantic colors', async () => {
  for (const kind of ['game','round','turn']) {
    let calls=0;
    const denied=render(kind,async()=>false,async()=>{calls++});
    await denied.props.onPress(); assert.equal(calls,0);
    const accepted=render(kind,async()=>true,async()=>{calls++});
    await accepted.props.onPress(); assert.equal(calls,1);
    assert.equal(accepted.props.variant,kind==='game'?'dangerMuted':'warningMuted');
  }
});
test('pending confirmation and disabled controls cannot submit duplicate actions', async () => {
  let finish!: (value:boolean)=>void, prompts=0,calls=0;
  const button=render('game',()=>{prompts++;return new Promise(resolve=>{finish=resolve})},async()=>{calls++});
  const first=button.props.onPress(); await button.props.onPress();
  assert.equal(prompts,1); finish(true); await first; assert.equal(calls,1);
  await render('round',async()=>{prompts++;return true},async()=>{calls++},true).props.onPress();
  assert.equal(prompts,1); assert.equal(calls,1);
});
