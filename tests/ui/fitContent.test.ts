import test from 'node:test';
import assert from 'node:assert/strict';
import { fitContent } from '../../src/core/ui/fitGeometry.ts';

test('cards fit remaining space on small phones, landscape and host panels', () => {
  for (const viewport of [{width: 288, height: 200}, {width: 560, height: 130}, {width: 180, height: 90}]) {
    for (const content of [{width: 288, height: 460}, {width: 560, height: 1200}]) {
      const {scale, left, top} = fitContent(viewport, content);
      const visualLeft = left + content.width * (1 - scale) / 2;
      const visualTop = top + content.height * (1 - scale) / 2;
      assert.ok(scale > 0 && scale <= 1);
      assert.ok(visualLeft >= -0.001 && visualTop >= -0.001);
      assert.ok(visualLeft + content.width * scale <= viewport.width + 0.001);
      assert.ok(visualTop + content.height * scale <= viewport.height + 0.001);
    }
  }
});
test('short content stays at natural size and recentres after a resize', () => {
  assert.deepEqual(fitContent({width: 400, height: 600}, {width: 300, height: 200}), {scale: 1, left: 50, top: 200});
  assert.equal(fitContent({width: 300, height: 100}, {width: 300, height: 200}).scale, 0.5);
});
test('unmeasured and zero-size areas stay hidden without invalid transforms', () => {
  assert.equal(fitContent({width: 0, height: 0}, {width: 0, height: 0}).scale, 0);
});
