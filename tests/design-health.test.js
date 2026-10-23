import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDesignHealth } from '../src/design-health.js';
import { snapshotToDtcg } from '../src/token-sync.js';

const snapshot = {
  fileKey: 'abc', fileName: 'Library',
  collections: [{ id: 'c', name: 'Theme', modes: [{ modeId: 'm', name: 'Default' }] }],
  variables: [{ id: 'v', name: 'primary', variableCollectionId: 'c', resolvedType: 'COLOR',
    valuesByMode: { m: { r: 1, g: 0, b: 0, a: 1 } } }]
};
const inventory = {
  pages: 2, nodes: 20, components: 3, instances: 4, text: 5, solidFills: 10,
  genericNames: { count: 2, examples: [{ id: '1', name: 'Frame 1' }] },
  unboundFills: { count: 4, examples: [] }, unstyledText: { count: 1, examples: [] },
  smallTargets: { count: 1, examples: [{ id: 'button', name: 'Button' }] }, smallText: { count: 0, examples: [] }
};

test('health reports measured coverage and token parity without a synthetic score', () => {
  const doc = snapshotToDtcg(snapshot);
  doc.Theme.primary.$value = '#00ff00';
  const report = buildDesignHealth(snapshot, inventory, doc);
  assert.equal(report.coverage.boundSolidFills, 0.6);
  assert.equal(report.coverage.styledText, 0.8);
  assert.deepEqual(report.tokenParity.mismatched, ['Theme/primary']);
  assert.equal(report.findings.find(f => f.category === 'parity').count, 1);
  assert.equal(report.findings.find(f => f.category === 'accessibility').count, 1);
  assert.equal('score' in report, false);
});

test('health rejects parity data from a different design file', () => {
  const doc = snapshotToDtcg(snapshot);
  doc.$extensions['figma-cli'].fileKey = 'other';
  assert.throws(() => buildDesignHealth(snapshot, inventory, doc), /belongs to Figma file/);
});

test('health exposes missing modes and broken aliases as findings', () => {
  const bad = { ...snapshot,
    collections: [{ ...snapshot.collections[0], modes: [...snapshot.collections[0].modes, { modeId: 'dark', name: 'Dark' }] }],
    variables: [{ ...snapshot.variables[0], valuesByMode: { m: { type: 'VARIABLE_ALIAS', id: 'missing' } } }] };
  const report = buildDesignHealth(bad, inventory);
  assert.equal(report.findings.find(f => f.message.includes('unresolved local alias')).count, 1);
  assert.equal(report.findings.find(f => f.message.includes('missing a collection mode')).count, 1);
});
