import { flattenDtcg, snapshotToDtcg } from './token-sync.js';

function buildDesignHealth(snapshot, inventory, tokenDocument = null) {
  const findings = [];
  const add = (category, severity, message, count, examples = []) => {
    if (count) findings.push({ category, severity, message, count, examples });
  };
  const modesByCollection = new Map(snapshot.collections.map(c => [c.id, c.modes]));
  const variableIds = new Set(snapshot.variables.map(v => v.id));
  const incomplete = [];
  const brokenAliases = [];
  for (const variable of snapshot.variables) {
    const modes = modesByCollection.get(variable.variableCollectionId) || [];
    if (modes.some(mode => !(mode.modeId in variable.valuesByMode))) incomplete.push(variable.name);
    for (const value of Object.values(variable.valuesByMode)) {
      if (value?.type === 'VARIABLE_ALIAS' && !variableIds.has(value.id)) brokenAliases.push(variable.name);
    }
  }
  add('tokens', 'error', 'Variables with an unresolved local alias', brokenAliases.length, brokenAliases.slice(0, 10));
  add('tokens', 'warning', 'Variables missing a collection mode value', incomplete.length, incomplete.slice(0, 10));
  add('naming', 'warning', 'Nodes with generic names', inventory.genericNames.count, inventory.genericNames.examples);
  add('tokens', 'warning', 'Solid fills without variable binding', inventory.unboundFills.count, inventory.unboundFills.examples);
  add('typography', 'warning', 'Text nodes without a text style', inventory.unstyledText.count, inventory.unstyledText.examples);
  add('accessibility', 'warning', 'Possible interactive targets under 24px', inventory.smallTargets?.count, inventory.smallTargets?.examples);
  add('readability', 'info', 'Text nodes under 12px', inventory.smallText?.count, inventory.smallText?.examples);

  let tokenParity = null;
  if (tokenDocument) {
    const source = tokenDocument.$extensions?.['figma-cli'];
    if (!source) throw new Error('Parity requires a figma-cli DTCG export');
    if ((source.fileKey && snapshot.fileKey && source.fileKey !== snapshot.fileKey) ||
        ((!source.fileKey || !snapshot.fileKey) && source.fileName !== snapshot.fileName)) {
      throw new Error(`Token file belongs to Figma file ${source.fileKey}, active file is ${snapshot.fileKey}`);
    }
    const actual = new Map(flattenDtcg(snapshotToDtcg(snapshot)).map(item => [item.path, item.token]));
    const expected = new Map(flattenDtcg(tokenDocument).map(item => [item.path, item.token]));
    const missingInFigma = [...expected.keys()].filter(path => !actual.has(path));
    const missingInFile = [...actual.keys()].filter(path => !expected.has(path));
    const modes = token => {
      const col = source.collections?.find(c => c.id === token.$extensions?.['figma-cli']?.collectionId);
      return { ...token.$extensions?.['figma-cli']?.modeValues, [col?.modes?.[0]?.name]: token.$value };
    };
    const mismatched = [...expected.keys()].filter(path => actual.has(path) &&
      JSON.stringify(modes(actual.get(path))) !== JSON.stringify(modes(expected.get(path))));
    tokenParity = { missingInFigma, missingInFile, mismatched };
    add('parity', 'error', 'Tokens in the file missing from Figma', missingInFigma.length, missingInFigma.slice(0, 10));
    add('parity', 'warning', 'Figma tokens missing from the file', missingInFile.length, missingInFile.slice(0, 10));
    add('parity', 'warning', 'Token values or modes differ', mismatched.length, mismatched.slice(0, 10));
  }

  return {
    source: { fileKey: snapshot.fileKey, fileName: snapshot.fileName },
    totals: { pages: inventory.pages, nodes: inventory.nodes, components: inventory.components,
      instances: inventory.instances, collections: snapshot.collections.length, variables: snapshot.variables.length,
      text: inventory.text, solidFills: inventory.solidFills },
    coverage: {
      boundSolidFills: inventory.solidFills ? (inventory.solidFills - inventory.unboundFills.count) / inventory.solidFills : null,
      styledText: inventory.text ? (inventory.text - inventory.unstyledText.count) / inventory.text : null
    },
    tokenParity, findings
  };
}

export { buildDesignHealth };
