import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldUseNativeEvalForHealth } from '../src/lib/cli-core.js';

test('selected CDP tab and active Safe Mode route through the daemon', () => {
  assert.equal(shouldUseNativeEvalForHealth({ mode: 'yolo', cdp: true, selectedTabId: 'tab-b' }), true);
  assert.equal(shouldUseNativeEvalForHealth({ mode: 'safe', plugin: true, cdp: true, selectedTabId: null }), true);
  assert.equal(shouldUseNativeEvalForHealth({ mode: 'yolo', cdp: true, selectedTabId: null }), false);
});
