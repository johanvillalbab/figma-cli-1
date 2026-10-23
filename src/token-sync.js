// Round-trip DTCG with Figma-specific mode and identity metadata.
const EXT = 'figma-cli';
const TYPE = { COLOR: 'color', FLOAT: 'dimension', BOOLEAN: 'boolean', STRING: 'string' };

function valueToDtcg(value, type, names) {
  if (value?.type === 'VARIABLE_ALIAS') {
    const path = names.get(value.id);
    if (!path) throw new Error(`Alias target ${value.id} is not a local variable`);
    return `{${path}}`;
  }
  if (type === 'COLOR') {
    if (!value || !['r', 'g', 'b'].every(k => Number.isFinite(value[k]))) throw new Error('Invalid Figma color');
    const hex = n => Math.round(n * 255).toString(16).padStart(2, '0');
    return '#' + hex(value.r) + hex(value.g) + hex(value.b) + (value.a == null || value.a === 1 ? '' : hex(value.a));
  }
  if (type === 'FLOAT') return `${value}px`;
  return value;
}

function dtcgToValue(value, type, paths) {
  if (typeof value === 'string' && /^\{[^{}]+\}$/.test(value)) {
    const id = paths.get(value.slice(1, -1));
    if (!id) throw new Error(`Unresolved token alias ${value}`);
    return { type: 'VARIABLE_ALIAS', id };
  }
  if (type === 'COLOR') {
    if (typeof value !== 'string' || !/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)) throw new Error(`Invalid color ${value}`);
    const n = i => parseInt(value.slice(i, i + 2), 16) / 255;
    return { r: n(1), g: n(3), b: n(5), a: value.length === 9 ? n(7) : 1 };
  }
  if (type === 'FLOAT') {
    const number = typeof value === 'number' ? value : /^-?\d+(?:\.\d+)?px$/.test(value) ? Number(value.slice(0, -2)) : NaN;
    if (!Number.isFinite(number)) throw new Error(`Invalid dimension ${value}`);
    return number;
  }
  if (type === 'BOOLEAN' && typeof value !== 'boolean') throw new Error(`Invalid boolean ${value}`);
  if (type === 'STRING' && typeof value !== 'string') throw new Error(`Invalid string ${value}`);
  return value;
}

function putToken(tree, path, token) {
  const parts = path.split('/');
  let cur = tree;
  for (const part of parts.slice(0, -1)) {
    if (part.startsWith('$') || !part || ['__proto__', 'constructor', 'prototype'].includes(part)) throw new Error(`Unsupported token path: ${path}`);
    if (cur[part]?.$value !== undefined) throw new Error(`Token path collision: ${path}`);
    cur = cur[part] ||= {};
  }
  const key = parts.at(-1);
  if (!key || key.startsWith('$') || ['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error(`Unsupported token path: ${path}`);
  if (cur[key] !== undefined) throw new Error(`Token path collision: ${path}`);
  cur[key] = token;
}

function snapshotToDtcg(snapshot) {
  const cols = new Map(snapshot.collections.map(c => [c.id, c]));
  const names = new Map(snapshot.variables.map(v => [v.id, `${cols.get(v.variableCollectionId)?.name}/${v.name}`.replaceAll('/', '.')]));
  if (new Set(names.values()).size !== names.size) throw new Error('Variable paths collide in DTCG alias notation');
  const tree = { $extensions: { [EXT]: { version: 1, fileKey: snapshot.fileKey || null, fileName: snapshot.fileName || null,
    collections: snapshot.collections.map(c => ({ id: c.id, name: c.name, modes: c.modes })) } } };
  for (const v of snapshot.variables) {
    const col = cols.get(v.variableCollectionId);
    if (!col) throw new Error(`Missing collection for ${v.name}`);
    const modeValues = {};
    for (const mode of col.modes) {
      if (!(mode.modeId in v.valuesByMode)) continue;
      modeValues[mode.name] = valueToDtcg(v.valuesByMode[mode.modeId], v.resolvedType, names);
    }
    const first = col.modes[0]?.name;
    if (!(first in modeValues)) throw new Error(`Missing default mode for ${v.name}`);
    const token = { $type: TYPE[v.resolvedType], $value: modeValues[first],
      $extensions: { [EXT]: { variableId: v.id, collectionId: col.id, resolvedType: v.resolvedType,
        modeValues, scopes: v.scopes, codeSyntax: v.codeSyntax, hiddenFromPublishing: v.hiddenFromPublishing } } };
    if (!token.$type) throw new Error(`Unsupported variable type: ${v.resolvedType}`);
    if (v.description) token.$description = v.description;
    putToken(tree, `${col.name}/${v.name}`, token);
  }
  return tree;
}

function flattenDtcg(doc) {
  const out = [];
  function walk(obj, path = []) {
    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith('$')) continue;
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid token group ${[...path, key].join('/')}`);
      if ('$value' in value) {
        if (Object.keys(value).some(child => !child.startsWith('$'))) throw new Error(`Token and group collide at ${[...path, key].join('/')}`);
        out.push({ path: [...path, key].join('/'), token: value });
      }
      else walk(value, [...path, key]);
    }
  }
  walk(doc);
  return out;
}

function planImport(doc, snapshot) {
  const meta = doc?.$extensions?.[EXT];
  if (meta?.version !== 1 || !Array.isArray(meta.collections)) throw new Error('Expected a figma-cli DTCG export with collection metadata');
  if ((meta.fileKey && snapshot.fileKey && meta.fileKey !== snapshot.fileKey) ||
      ((!meta.fileKey || !snapshot.fileKey) && meta.fileName !== snapshot.fileName)) {
    throw new Error(`Token file belongs to Figma file ${meta.fileKey || meta.fileName}, active file is ${snapshot.fileKey || snapshot.fileName}`);
  }
  const existingCols = new Map(snapshot.collections.map(c => [c.id, c]));
  const existingVars = new Map(snapshot.variables.map(v => [v.id, v]));
  const byPath = new Map(snapshot.variables.map(v => {
    const col = existingCols.get(v.variableCollectionId);
    return [`${col?.name}/${v.name}`, v];
  }));
  const tokens = flattenDtcg(doc);
  if (new Set(tokens.map(t => t.path.replaceAll('/', '.'))).size !== tokens.length) {
    throw new Error('Token paths collide in DTCG alias notation');
  }
  for (const collection of meta.collections) {
    if (!collection.id || !collection.name || !Array.isArray(collection.modes) || !collection.modes.length ||
        collection.modes.some(mode => !mode.name)) throw new Error('Invalid collection or mode metadata');
  }
  const pathIds = new Map(snapshot.variables.map(v => [`${existingCols.get(v.variableCollectionId)?.name}/${v.name}`.replaceAll('/', '.'), v.id]));
  for (const { path, token } of tokens) pathIds.set(path.replaceAll('/', '.'), token.$extensions?.[EXT]?.variableId || path);
  const currentById = new Map(flattenDtcg(snapshotToDtcg(snapshot)).map(item => [item.token.$extensions[EXT].variableId, item]));
  const seen = new Set();
  const operations = [];
  for (const { path, token } of tokens) {
    const ext = token.$extensions?.[EXT];
    if (!ext) throw new Error(`Missing Figma metadata for ${path}`);
    const colMeta = meta.collections.find(c => c.id === ext.collectionId);
    if (!colMeta) throw new Error(`Unknown collection for ${path}`);
    const name = path.slice(colMeta.name.length + 1);
    if (!path.startsWith(colMeta.name + '/') || !name) throw new Error(`Collection path mismatch: ${path}`);
    const existing = existingVars.get(ext.variableId) || byPath.get(path);
    if (existing && existing.resolvedType !== ext.resolvedType) throw new Error(`Type conflict for ${path}`);
    if (existing && seen.has(existing.id)) throw new Error(`Duplicate variable ${existing.id}`);
    if (existing) seen.add(existing.id);
    const modes = { ...ext.modeValues };
    modes[colMeta.modes[0].name] = token.$value;
    for (const modeName of Object.keys(modes)) if (!colMeta.modes.some(m => m.name === modeName)) throw new Error(`Unknown mode ${modeName} in ${path}`);
    if (!TYPE[ext.resolvedType] || TYPE[ext.resolvedType] !== token.$type) throw new Error(`Type mismatch in ${path}`);
    for (const value of Object.values(modes)) dtcgToValue(value, ext.resolvedType, pathIds);
    const current = existing ? currentById.get(existing.id) : null;
    const changed = !existing || !current || current.path !== path ||
      JSON.stringify(current.token.$extensions[EXT].modeValues) !== JSON.stringify(modes) ||
      (current.token.$description || '') !== (token.$description || '') ||
      JSON.stringify(current.token.$extensions[EXT].scopes) !== JSON.stringify(ext.scopes) ||
      JSON.stringify(current.token.$extensions[EXT].codeSyntax) !== JSON.stringify(ext.codeSyntax) ||
      current.token.$extensions[EXT].hiddenFromPublishing !== ext.hiddenFromPublishing;
    if (!changed) continue;
    operations.push({ path, collection: colMeta, name, existingId: existing?.id || null,
      resolvedType: ext.resolvedType, modes, description: token.$description ?? '', scopes: ext.scopes,
      codeSyntax: ext.codeSyntax, hiddenFromPublishing: ext.hiddenFromPublishing });
  }
  if (!tokens.length && !meta.collections.length) throw new Error('Token file is empty; refusing to sync');
  return { source: { fileKey: meta.fileKey, fileName: meta.fileName }, collections: meta.collections, operations,
    create: operations.filter(o => !o.existingId).length, update: operations.filter(o => o.existingId).length,
    unchanged: tokens.length - operations.length, preserve: snapshot.variables.length - seen.size };
}

export { dtcgToValue, flattenDtcg, planImport, snapshotToDtcg };
