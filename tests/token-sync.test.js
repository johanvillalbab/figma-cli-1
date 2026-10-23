import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { flattenDtcg, planImport, snapshotToDtcg } from '../src/token-sync.js';
import { assertSafeExport, buildImportCode } from '../src/token-sync-service.js';

const snapshot = {
  fileKey: 'file-a', fileName: 'Design',
  collections: [{ id: 'col-1', name: 'Theme', modes: [{ modeId: 'light', name: 'Light' }, { modeId: 'dark', name: 'Dark' }] }],
  variables: [
    { id: 'v1', name: 'colors/brand', variableCollectionId: 'col-1', resolvedType: 'COLOR',
      valuesByMode: { light: { r: 1, g: 0, b: 0, a: 1 }, dark: { r: 0, g: 0, b: 0, a: 1 } }, description: 'Brand' },
    { id: 'v2', name: 'colors/button', variableCollectionId: 'col-1', resolvedType: 'COLOR',
      valuesByMode: { light: { type: 'VARIABLE_ALIAS', id: 'v1' }, dark: { type: 'VARIABLE_ALIAS', id: 'v1' } } }
  ]
};

test('DTCG export preserves all modes, aliases, identity and provenance', () => {
  const doc = snapshotToDtcg(snapshot);
  assert.equal(doc.Theme.colors.brand.$value, '#ff0000');
  assert.equal(doc.Theme.colors.brand.$extensions['figma-cli'].modeValues.Dark, '#000000');
  assert.equal(doc.Theme.colors.button.$value, '{Theme.colors.brand}');
  assert.equal(doc.Theme.colors.button.$extensions['figma-cli'].variableId, 'v2');
  assert.equal(doc.$extensions['figma-cli'].fileKey, 'file-a');
  assert.equal(flattenDtcg(doc).length, 2);
});

test('import plan updates by ID, preserves unrelated variables and rejects another Figma file', () => {
  const doc = snapshotToDtcg(snapshot);
  doc.Theme.colors.brand.$value = '#00ff00';
  const plan = planImport(doc, { ...snapshot, variables: [...snapshot.variables, {
    id: 'v3', name: 'other', variableCollectionId: 'col-1', resolvedType: 'STRING', valuesByMode: { light: 'x' }
  }] });
  assert.equal(plan.create, 0);
  assert.equal(plan.update, 1);
  assert.equal(plan.unchanged, 1);
  assert.equal(plan.preserve, 1);
  assert.equal(plan.operations[0].modes.Light, '#00ff00');
  assert.throws(() => planImport(doc, { ...snapshot, fileKey: 'file-b' }), /belongs to Figma file/);
});

test('export rejects colliding token paths instead of dropping a variable', () => {
  assert.throws(() => snapshotToDtcg({ ...snapshot, variables: [...snapshot.variables, {
    id: 'v4', name: 'colors/brand/detail', variableCollectionId: 'col-1', resolvedType: 'STRING', valuesByMode: { light: 'x', dark: 'y' }
  }] }), /collision/);
});

test('export guard refuses foreign files and tokens that would be discarded', () => {
  const doc = snapshotToDtcg(snapshot);
  const foreign = structuredClone(doc);
  foreign.$extensions['figma-cli'].fileKey = 'other';
  assert.throws(() => assertSafeExport(foreign, doc), /different or unknown Figma source/);
  const extra = structuredClone(doc);
  extra.Theme.colors.extra = { $type: 'string', $value: 'keep me' };
  assert.throws(() => assertSafeExport(extra, doc), /discard 1 tokens/);
});

test('import applies changed modes and aliases to the intended variables', async () => {
  const doc = snapshotToDtcg(snapshot);
  doc.Theme.colors.brand.$value = '#00ff00';
  doc.Theme.colors.brand.$extensions['figma-cli'].modeValues.Dark = '#0000ff';
  doc.Theme.colors.new = { $type: 'color', $value: '#ffffff', $extensions: { 'figma-cli': {
    variableId: 'new', collectionId: 'col-1', resolvedType: 'COLOR',
    modeValues: { Light: '#ffffff', Dark: '{Theme.colors.brand}' }
  } } };
  const plan = planImport(doc, snapshot);
  const vars = snapshot.variables.map(v => ({ ...v, valuesByMode: { ...v.valuesByMode },
    setValueForMode(mode, value) { this.valuesByMode[mode] = value; },
    setVariableCodeSyntax() {} }));
  const col = { ...snapshot.collections[0], modes: [...snapshot.collections[0].modes],
    renameMode(id, name) { this.modes.find(m => m.modeId === id).name = name; },
    addMode(name) { this.modes.push({ modeId: name, name }); return name; } };
  const figma = { variables: {
    getLocalVariableCollectionsAsync: async () => [col],
    getLocalVariablesAsync: async () => vars,
    createVariable(name, collection, resolvedType) {
      const variable = { id: 'created', name, variableCollectionId: collection.id, resolvedType,
        valuesByMode: {}, setValueForMode(mode, value) { this.valuesByMode[mode] = value; },
        setVariableCodeSyntax() {} };
      return variable;
    }
  } };
  const result = await runInNewContext(buildImportCode(plan), { figma });
  assert.equal(result.errors.length, 0);
  assert.equal(vars[0].valuesByMode.light.g, 1);
  assert.equal(vars[0].valuesByMode.dark.b, 1);
  assert.equal(vars[2].valuesByMode.dark.id, 'v1');
});
