import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'fs';
import { fastEval } from './lib/cli-core.js';
import { flattenDtcg, planImport, snapshotToDtcg } from './token-sync.js';

async function snapshotFigma() {
  return fastEval(`(async () => {
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const variables = await figma.variables.getLocalVariablesAsync();
    return {
      fileKey: figma.fileKey || null, fileName: figma.root.name,
      collections: collections.map(c => ({ id: c.id, name: c.name, modes: c.modes.map(m => ({ modeId: m.modeId, name: m.name })) })),
      variables: variables.map(v => ({ id: v.id, name: v.name, variableCollectionId: v.variableCollectionId,
        resolvedType: v.resolvedType, valuesByMode: v.valuesByMode, description: v.description,
        scopes: v.scopes, codeSyntax: v.codeSyntax, hiddenFromPublishing: v.hiddenFromPublishing }))
    };
  })()`);
}

function assertSafeExport(previous, doc, output = 'target file') {
  const source = previous.$extensions?.['figma-cli'];
  const target = doc.$extensions['figma-cli'];
  if (!source || (source.fileKey && target.fileKey && source.fileKey !== target.fileKey) ||
      ((!source.fileKey || !target.fileKey) && source.fileName !== target.fileName)) {
    throw new Error('Existing file has a different or unknown Figma source; pass --replace to overwrite');
  }
  const targetCollections = new Set(target.collections.map(c => c.id));
  if (source.collections?.some(c => !targetCollections.has(c.id)) ||
      Object.keys(previous.$extensions || {}).some(key => key !== 'figma-cli')) {
    throw new Error('Export would discard collection or extension metadata; pass --replace to overwrite');
  }
  const paths = new Set(flattenDtcg(doc).map(t => t.path));
  const extra = flattenDtcg(previous).filter(t => !paths.has(t.path));
  if (extra.length) throw new Error(`Export would discard ${extra.length} tokens in ${output}; pass --replace to overwrite`);
}

async function exportDtcg(output, { dryRun = false, replace = false } = {}) {
  const doc = snapshotToDtcg(await snapshotFigma());
  const incoming = flattenDtcg(doc);
  if (!incoming.length) throw new Error('Figma has no local variables; refusing to export an empty token file');
  if (output && existsSync(output) && !replace) {
    const previous = JSON.parse(readFileSync(output, 'utf8'));
    assertSafeExport(previous, doc, output);
  }
  const text = JSON.stringify(doc, null, 2) + '\n';
  if (output && !dryRun) {
    const temporary = `${output}.figma-cli-${process.pid}-${Date.now()}.tmp`;
    try {
      writeFileSync(temporary, text);
      renameSync(temporary, output);
    } finally {
      if (existsSync(temporary)) unlinkSync(temporary);
    }
  }
  return { source: doc.$extensions['figma-cli'], count: incoming.length, text };
}

async function importDtcg(file, { dryRun = false } = {}) {
  const doc = JSON.parse(readFileSync(file, 'utf8'));
  const snapshot = await snapshotFigma();
  const plan = planImport(doc, snapshot);
  if (dryRun) return { ...plan, applied: false };
  const result = await fastEval(buildImportCode(plan));
  return { ...plan, ...result };
}

function buildImportCode(plan) {
  const payload = JSON.stringify(plan.operations);
  const collectionsPayload = JSON.stringify(plan.collections);
  return `(async () => {
    const ops = ${payload};
    const requestedCollections = ${collectionsPayload};
    const allCols = await figma.variables.getLocalVariableCollectionsAsync();
    const allVars = await figma.variables.getLocalVariablesAsync();
    const cols = new Map(allCols.map(c => [c.id, c]));
    const vars = new Map(allVars.map(v => [v.id, v]));
    const byPath = new Map(allVars.map(v => [((cols.get(v.variableCollectionId)?.name || '') + '/' + v.name).replaceAll('/', '.'), v]));
    const plannedPaths = new Set(ops.map(o => o.path.replaceAll('/', '.')));
    for (const o of ops) for (const val of Object.values(o.modes)) {
      if (typeof val === 'string' && /^\\{[^{}]+\\}$/.test(val)) {
        const path = val.slice(1, -1);
        if (!byPath.has(path) && !plannedPaths.has(path)) throw new Error('Unresolved alias ' + val + ' in ' + o.path);
      }
    }
    const errors = [];
    const modeIds = new Map();
    const collectionModes = new Map();
    for (const requested of requestedCollections) {
      try {
        let col = cols.get(requested.id) || allCols.find(c => c.name === requested.name);
        if (!col) {
          col = figma.variables.createVariableCollection(requested.name);
          col.renameMode(col.modes[0].modeId, requested.modes[0].name);
          allCols.push(col);
          cols.set(col.id, col);
        }
        if (col.name !== requested.name) col.name = requested.name;
        const ids = {};
        for (const m of requested.modes) {
          let actual = col.modes.find(cm => cm.modeId === m.modeId) || col.modes.find(cm => cm.name === m.name);
          if (actual && actual.name !== m.name) {
            col.renameMode(actual.modeId, m.name);
            actual = { modeId: actual.modeId, name: m.name };
          }
          if (!actual) {
            const id = col.addMode(m.name);
            actual = { modeId: id, name: m.name };
          }
          ids[m.name] = actual.modeId;
        }
        collectionModes.set(requested.id, { col, ids });
      } catch (e) { errors.push({ collection: requested.name, phase: 'collection', error: e.message }); }
    }
    for (const o of ops) {
      try {
        const { col, ids } = collectionModes.get(o.collection.id);
        modeIds.set(o.path, ids);
        let variable = vars.get(o.existingId) || allVars.find(v => v.variableCollectionId === col.id && v.name === o.name);
        if (!variable) {
          variable = figma.variables.createVariable(o.name, col, o.resolvedType);
          allVars.push(variable);
          vars.set(variable.id, variable);
        }
        if (variable.variableCollectionId !== col.id || variable.resolvedType !== o.resolvedType) throw new Error('Identity/type conflict');
        variable.name = o.name;
        variable.description = o.description;
        if (o.scopes) variable.scopes = o.scopes;
        if (o.codeSyntax) for (const [platform, syntax] of Object.entries(o.codeSyntax)) variable.setVariableCodeSyntax(platform, syntax);
        if (o.hiddenFromPublishing != null) variable.hiddenFromPublishing = o.hiddenFromPublishing;
        byPath.set(o.path.replaceAll('/', '.'), variable);
      } catch (e) { errors.push({ path: o.path, phase: 'create', error: e.message }); }
    }
    for (const aliases of [false, true]) for (const o of ops) {
      const variable = byPath.get(o.path.replaceAll('/', '.'));
      if (!variable || !modeIds.has(o.path)) continue;
      for (const [name, val] of Object.entries(o.modes)) {
        const isAlias = typeof val === 'string' && /^\\{[^{}]+\\}$/.test(val);
        if (isAlias !== aliases) continue;
        try {
          let value = val;
          if (isAlias) {
            const target = byPath.get(val.slice(1, -1));
            if (!target) throw new Error('Unresolved alias ' + val);
            value = { type: 'VARIABLE_ALIAS', id: target.id };
          } else if (o.resolvedType === 'COLOR') {
            if (typeof val !== 'string' || !/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(val)) throw new Error('Invalid color ' + val);
            const n = i => parseInt(val.slice(i, i + 2), 16) / 255;
            value = { r: n(1), g: n(3), b: n(5), a: val.length === 9 ? n(7) : 1 };
          } else if (o.resolvedType === 'FLOAT') {
            value = typeof val === 'number' ? val : /^-?\\d+(?:\\.\\d+)?px$/.test(val) ? Number(val.slice(0, -2)) : NaN;
            if (!Number.isFinite(value)) throw new Error('Invalid dimension ' + val);
          } else if (o.resolvedType === 'BOOLEAN' && typeof val !== 'boolean') throw new Error('Invalid boolean ' + val);
          else if (o.resolvedType === 'STRING' && typeof val !== 'string') throw new Error('Invalid string ' + val);
          variable.setValueForMode(modeIds.get(o.path)[name], value);
        } catch (e) { errors.push({ path: o.path, mode: name, phase: 'value', error: e.message }); }
      }
    }
    return { applied: ops.length, errors };
  })()`;
}

export { assertSafeExport, buildImportCode, exportDtcg, importDtcg, snapshotFigma };
