import test from 'node:test';
import assert from 'node:assert/strict';
import {buttonFontSize} from '../../src/core/ui/buttonFontSize.ts';
test('long button labels fit phone widths and recover after resizing',()=>{
 assert.equal(buttonFontSize(16,100,200),8);
 assert.equal(buttonFontSize(16,150,200),12);
 assert.equal(buttonFontSize(16,300,200),16);
 assert.equal(buttonFontSize(16,0,200),16);
 assert.equal(buttonFontSize(16,100,0),16);
});
